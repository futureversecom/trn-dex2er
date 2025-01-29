import { useFutureverseSigner } from "@futureverse/auth-react";
import { CustomExtrinsicBuilder } from "@futureverse/transact";
import { useTrnApi } from "@futureverse/transact-react";
import { parseJsonRpcResult } from "@therootnetwork/extrinsic";
import {
	createContext,
	type PropsWithChildren,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";

import type { ContextTag, TokenSource, TrnToken } from "@/libs/types";

import { ROOT_NETWORK } from "../constants";
import { DEFAULT_GAS_TOKEN } from "../constants";
import { useCustomExtrinsicBuilder } from "../hooks";
import {
	type TrnTokenInputs,
	type TrnTokenInputState,
	useCheckValidPool,
	useTrnTokenInputs,
} from "../hooks";
import { formatRootscanId } from "../utils";
import { Balance, parseSlippage, toFixed } from "../utils";
import { createBuilder } from "../utils/createBuilder";
import { useTrnTokens } from "./TrnTokenContext";
import { useWallets } from "./WalletContext";

type sourceType = "x" | "y";
type dexTxType = "exactSupply" | "exactTarget";

export type TrnSwapContextType = {
	resetState: () => void;
	switchTokens: () => void;
	signTransaction: () => void;
	setSrc: (src: sourceType) => void;
	setTag: (tag?: ContextTag) => void;
	buildTransaction: () => Promise<void>;
	setSlippage: (slippage: string) => void;
	setGasToken: (gasToken: TrnToken) => void;
	setToken: (args: { src: TokenSource; token: TrnToken }) => void;
	setAmount: (args: { src: TokenSource; amount: string }) => void;
	ratio?: string;
	estimatedFee?: string;
	xAmountMax?: Balance<TrnToken>;
	yAmountMin?: Balance<TrnToken>;
} & TrnSwapState &
	Omit<TrnTokenInputs, "setXAmount" | "setYAmount" | "refetchTokenBalances" | "setXTokenError">;

const TrnSwapContext = createContext<TrnSwapContextType>({} as TrnSwapContextType);

interface TrnSwapState extends TrnTokenInputState {
	ratio?: string;
	error?: string;
	slippage: string;
	tag?: ContextTag;
	dexTx: dexTxType;
	feeError?: string;
	source: sourceType;
	gasToken: TrnToken;
	gasBalance?: string;
	explorerUrl?: string;
	estimatedFee?: string;
	gasFeePlanck?: string;
	canPayForGas?: boolean;
	priceDifference?: number;
	sufficientLiquidity?: boolean;
	xAmountRatio?: Balance<TrnToken>;
	yAmountRatio?: Balance<TrnToken>;
	builtTx?: CustomExtrinsicBuilder;
}

const initialState = {
	source: "x",
	xAmount: "",
	yAmount: "",
	slippage: "5",
	dexTx: "exactSupply",
	gasToken: DEFAULT_GAS_TOKEN,
} as TrnSwapState;

export function TrnSwapProvider({ children }: PropsWithChildren) {
	const [state, setState] = useState<TrnSwapState>(initialState);

	const updateState = (update: Partial<TrnSwapState>) =>
		setState((prev) => ({ ...prev, ...update }));

	const setTag = useCallback((tag?: ContextTag) => updateState({ tag }), []);
	const setSrc = useCallback((source: sourceType) => updateState({ source }), []);
	const setDexTx = useCallback((dexTx: dexTxType) => updateState({ dexTx }), []);
	const setBuildTx = useCallback((builtTx: CustomExtrinsicBuilder) => updateState({ builtTx }), []);
	const setGasToken = useCallback((gasToken: TrnToken) => updateState({ gasToken, error: "" }), []);
	const setSufficientLiquidity = useCallback(
		(sufficientLiquidity?: boolean) => updateState({ sufficientLiquidity }),
		[]
	);
	const setGasInfo = useCallback(
		(estimatedFee: string, gasFeePlanck: string, canPayForGas: boolean, gasBalance: string) =>
			updateState({ estimatedFee, gasFeePlanck, canPayForGas, gasBalance }),
		[]
	);
	const setToken = useCallback(
		({ src, token }: { src: TokenSource; token: TrnToken }) =>
			updateState({
				[`${src}Token`]: token,
			}),
		[]
	);

	const {
		setXAmount,
		setYAmount,
		isDisabled: isTokenDisabled,
		refetchTokenBalances,
		...tokenInputs
	} = useTrnTokenInputs(state, setToken);

	const resetState = useCallback(() => {
		setState(initialState);
		setXAmount("");
		setYAmount("");
	}, [setXAmount, setYAmount]);

	const { trnApi } = useTrnApi();
	const { userSession } = useWallets();
	const { getTokenBalance } = useTrnTokens();
	const signer = useFutureverseSigner();
	const customEx = useCustomExtrinsicBuilder({
		trnApi,
		walletAddress: userSession?.eoa ?? "",
		signer,
	});

	useEffect(() => {
		void (async () => {
			if (!trnApi || !state.xToken || !state.yToken || !state.source) return;

			const sourceBalance = new Balance(
				tokenInputs[`${state.source}Amount`],
				state[`${state.source}Token`]!,
				false
			);

			if (sourceBalance.toNumber() === 0) {
				if (state.source === "x") {
					if (!tokenInputs[`${state.source}Amount`].includes(".")) {
						setXAmount("");
					}
					setYAmount("");
				} else {
					if (!tokenInputs[`${state.source}Amount`].includes(".")) {
						setYAmount("");
					}
					setXAmount("");
				}

				updateState({
					ratio: undefined,
					xAmountRatio: undefined,
					yAmountRatio: undefined,
				});
				return;
			}

			// Temporary try/catch till rpc error reporting is fixed
			try {
				const result = parseJsonRpcResult<[number, number]>(
					await trnApi.rpc.dex[state.source === "x" ? "getAmountsOut" : "getAmountsIn"](
						sourceBalance.toPlanckString(),
						[state.xToken.assetId, state.yToken.assetId]
					)
				);

				if (result.isErr()) return console.warn("Dex RPC error:", result.error.cause);

				const [calculatedFrom, calculatedTo] = result.value;
				const calculatedFromBalance = new Balance(calculatedFrom, state.xToken);
				const calculatedtoBalance = new Balance(calculatedTo, state.yToken);

				if (state.source === "x") setYAmount(calculatedtoBalance.toUnit().toString());
				else setXAmount(calculatedFromBalance.toUnit().toString());

				const ratio = toFixed(
					calculatedtoBalance.toUnit().dividedBy(calculatedFromBalance.toUnit()).toNumber(),
					10
				);

				setSufficientLiquidity(true);
				updateState({
					xAmountRatio: calculatedFromBalance,
					yAmountRatio: calculatedtoBalance,
					ratio: ratio,
					sufficientLiquidity: true,
				});
			} catch (e) {
				console.warn(e);
				// Its more likely than not that insufficient liquidity is the issue here. When the rpc error reporting is fixed we can know for sure.
				setSufficientLiquidity(false);
			}
		})();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		trnApi,
		setXAmount,
		setYAmount,
		state.xToken,
		state.yToken,
		tokenInputs.xAmount,
		tokenInputs.yAmount,
	]);

	const yAmountMin = useMemo(() => {
		if (!state.yAmountRatio) return;
		return state.yAmountRatio.multipliedBy(1 - +state.slippage / 100).integerValue();
	}, [state.slippage, state.yAmountRatio]);

	const xAmountMax = useMemo(() => {
		if (!state.xAmountRatio) return;
		return state.xAmountRatio
			.multipliedBy(1 - (1 - +state.slippage / 100))
			.plus(state.xAmountRatio)
			.integerValue();
	}, [state.slippage, state.xAmountRatio]);

	const swapTx = useMemo(() => {
		if (
			!trnApi ||
			!xAmountMax ||
			!yAmountMin ||
			!state.xToken ||
			!state.yToken ||
			!state.xAmountRatio ||
			!state.yAmountRatio
		)
			return;

		const removeGas = (amount: string) => {
			if (!state.gasBalance || !state.gasFeePlanck) {
				return amount;
			}
			if (state.xToken?.assetId == state.gasToken.assetId) {
				const amountDifference = +state.gasBalance! - +amount;
				if (+state.gasFeePlanck! > amountDifference) {
					return (+amount - +state.gasFeePlanck! * 1.25).toString().split(".")[0];
				}
			}
			return amount;
		};

		if (state.source === "x") {
			const xAmountRatioWithoutGas = removeGas(state.xAmountRatio.toPlanckString());
			if (+xAmountRatioWithoutGas <= 0) return;
			return trnApi.tx.dex.swapWithExactSupply(
				xAmountRatioWithoutGas,
				yAmountMin.toPlanckString(),
				[state.xToken.assetId, state.yToken.assetId],
				null,
				null
			);
		} else {
			const xAmountMaxWithoutGas = removeGas(xAmountMax.toPlanckString());
			if (+xAmountMaxWithoutGas <= 0) return;
			return trnApi.tx.dex.swapWithExactTarget(
				state.yAmountRatio.toPlanckString(),
				xAmountMaxWithoutGas,
				[state.xToken.assetId, state.yToken.assetId],
				null,
				null
			);
		}
	}, [
		trnApi,
		xAmountMax,
		yAmountMin,
		state.xToken,
		state.yToken,
		state.source,
		state.gasToken,
		state.gasBalance,
		state.xAmountRatio,
		state.yAmountRatio,
		state.gasFeePlanck,
	]);

	useEffect(() => {
		if (!trnApi || !state.xToken || !state.yToken || !userSession || !swapTx || !customEx) return;

		const calculateFeeEstimate = async () => {
			const builder = await createBuilder(
				userSession,
				state.gasToken.assetId,
				state.slippage,
				customEx,
				swapTx
			);
			const { gasString, gasFee } = await builder.getGasFees();
			const [gas] = gasString.split(" ");

			const gasBalance = await builder.checkBalance({
				walletAddress: userSession.futurepass,
				assetId: state.gasToken.assetId,
			});

			const canPay = new Balance(+gasBalance.balance, gasBalance).toUnit().toNumber() - +gas >= 0;
			setGasInfo(gas, gasFee, canPay, gasBalance.balance);
		};
		calculateFeeEstimate();
	}, [
		trnApi,
		swapTx,
		customEx,
		setGasInfo,
		userSession,
		state.xToken,
		state.yToken,
		state.slippage,
		state.gasToken.assetId,
	]);

	const buildTransaction = useCallback(async () => {
		if (
			!trnApi ||
			!state.xToken ||
			!state.yToken ||
			!signer ||
			!userSession ||
			!customEx ||
			!swapTx
		)
			return;

		const builder = await createBuilder(
			userSession,
			state.gasToken.assetId,
			state.slippage,
			customEx,
			swapTx
		);

		setBuildTx(builder);
	}, [
		trnApi,
		swapTx,
		signer,
		customEx,
		setBuildTx,
		userSession,
		state.xToken,
		state.yToken,
		state.slippage,
		state.gasToken.assetId,
	]);

	const setAmount = useCallback(
		async ({ src, amount }: { src: TokenSource; amount: string }) => {
			if (src === "x") {
				if (amount === "") {
					setYAmount("");
				}
				setXAmount(amount);
				setDexTx("exactSupply");
			} else {
				if (amount === "") {
					setXAmount("");
				}
				setYAmount(amount);
				setDexTx("exactTarget");
			}
		},
		[setXAmount, setYAmount, setDexTx]
	);

	const setSlippage = useCallback((slippage: string) => {
		const parsed = parseSlippage(slippage);

		if (typeof parsed !== "string") return;

		updateState({ slippage: parsed });
	}, []);

	const switchTokens = useCallback(async () => {
		updateState({
			xToken: state.yToken,
			yToken: state.xToken,
			gasToken: state.yToken ?? state.gasToken,
		});

		if (state.source === "x") {
			setYAmount(tokenInputs.xAmount);
			setSrc("y");
		} else {
			setXAmount(tokenInputs.yAmount);
			setSrc("x");
		}
	}, [state, setXAmount, setYAmount, tokenInputs, setSrc]);

	const signTransaction = useCallback(async () => {
		if (!state.builtTx) return;

		try {
			const result = await state.builtTx.signAndSend({
				onSign: () => {
					setTag("submit");
				},
				onSend: () => {
					setTag("submitted");
				},
			});
			if (!result) return setTag(undefined);

			refetchTokenBalances();

			updateState({
				explorerUrl: `${ROOT_NETWORK.ExplorerUrl}/extrinsic/${formatRootscanId(result.extrinsicId)}`,
			});
		} catch (err: any) {
			setTag("failed");
			updateState({
				error: err.message ?? err,
			});
		}
	}, [state.builtTx, setTag, refetchTokenBalances]);

	const isDisabled = useMemo(() => {
		if (state.tag === "sign") return true;

		return isTokenDisabled || !!state.error || state.canPayForGas === false;
	}, [state, isTokenDisabled]);

	const checkValidPool = useCheckValidPool();

	useEffect(() => {
		const checkErrors = async () => {
			if (!state.xToken || !state.yToken) return;

			const isValid = await checkValidPool([state.xToken.assetId, state.yToken.assetId]);
			console.log("is valid ", isValid);
			if (!isValid) {
				updateState({ error: "This pair is not valid yet. Choose another token to swap" });
				return;
			}

			if (state.sufficientLiquidity === false) {
				return updateState({ error: "This pair has insufficient liquidity for this trade" });
			}

			const xBalance = getTokenBalance(state.xToken);
			if (
				state.dexTx === "exactTarget" &&
				xAmountMax &&
				xBalance &&
				xAmountMax.toNumber() > xBalance.toNumber()
			) {
				updateState({
					error: `Insufficient ${state.xToken.name} balance, the amount spent for this swap may exceed your balance.`,
				});
				return;
			}

			if (state.canPayForGas === false) {
				updateState({ error: `Insufficient ${state.gasToken.name} to pay for gas` });
				return;
			}

			updateState({ error: "" });
		};
		void checkErrors();
	}, [
		xAmountMax,
		state.dexTx,
		state.xToken,
		state.yToken,
		state.source,
		checkValidPool,
		state.slippage,
		getTokenBalance,
		state.canPayForGas,
		state.gasToken.name,
		state.sufficientLiquidity,
	]);

	return (
		<TrnSwapContext.Provider
			value={{
				setTag,
				setSrc,
				setToken,
				setAmount,
				isDisabled,
				resetState,
				setSlippage,
				setGasToken,
				switchTokens,
				signTransaction,
				buildTransaction,

				xAmountMax,
				yAmountMin,

				...state,
				...tokenInputs,
			}}
		>
			{children}
		</TrnSwapContext.Provider>
	);
}

export function useTrnSwap() {
	return useContext(TrnSwapContext);
}
