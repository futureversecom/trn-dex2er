import { useFutureverseSigner } from "@futureverse/auth-react";
import { CustomExtrinsicBuilder } from "@futureverse/transact";
import { useTrnApi } from "@futureverse/transact-react";
import { parseJsonRpcResult } from "@therootnetwork/extrinsic";
import BigNumber from "bignumber.js";
import {
	createContext,
	type PropsWithChildren,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
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
import { getNetworkFee, getSwapFee } from "../utils";
import { formatRootscanId } from "../utils";
import { Balance, parseSlippage, toFixed } from "../utils";
import { createBuilder } from "../utils/createBuilder";
import { useTrnTokens } from "./TrnTokenContext";
import { useWallets } from "./WalletContext";

export type TrnSwapContextType = {
	resetState: () => void;
	switchTokens: () => void;
	signTransaction: () => void;
	setSrc: (src: "x" | "y") => void;
	setTag: (tag?: ContextTag) => void;
	setSlippage: (slippage: string) => void;
	setGasToken: (gasToken: TrnToken) => void;
	setToken: (args: { src: TokenSource; token: TrnToken }) => void;
	setAmount: (args: { src: TokenSource; amount: string }) => void;
	ratioAmounts: (args: { amount?: string }) => void;
	estimatedFee?: string;
	ratio?: string;
} & TrnSwapState &
	Omit<TrnTokenInputs, "setXAmount" | "setYAmount">;

const TrnSwapContext = createContext<TrnSwapContextType>({} as TrnSwapContextType);

interface TrnSwapState extends TrnTokenInputState {
	gasToken: TrnToken;
	slippage: string;
	yAmountMin?: string;
	ratio?: string;
	tag?: ContextTag;
	explorerUrl?: string;
	error?: string;
	feeError?: string;
	priceDifference?: number;
}

const initialState = {
	slippage: "5",
	xAmount: "",
	yAmount: "",
	gasToken: DEFAULT_GAS_TOKEN,
} as TrnSwapState;

export function TrnSwapProvider({ children }: PropsWithChildren) {
	const [state, setState] = useState<TrnSwapState>(initialState);
	const [estimatedFee, setEstimatedFee] = useState<string>();
	const [canPayForGas, setCanPayForGas] = useState<boolean>();
	const builtTx = useRef<CustomExtrinsicBuilder>();
	const dexAmounts = useRef<{
		calculatedFromBalance: Balance<TrnToken>;
		calculatedToBalance: Balance<TrnToken>;
		toAmountMin: Balance<TrnToken>;
	}>();
	const source = useRef<"x" | "y">("x");

	const updateState = (update: Partial<TrnSwapState>) =>
		setState((prev) => ({ ...prev, ...update }));

	const resetState = () => setState(initialState);

	const setTag = useCallback((tag?: ContextTag) => updateState({ tag }), []);
	const setSrc = useCallback((src: "x" | "y") => (source.current = src), []);
	const setGasToken = useCallback((gasToken: TrnToken) => updateState({ gasToken }), []);
	const setToken = useCallback(({ src, token }: { src: TokenSource; token: TrnToken }) => {
		if (src === "x")
			return updateState({
				xToken: token,
			});

		updateState({
			yToken: token,
		});
	}, []);

	const {
		setXAmount,
		setYAmount,
		isDisabled: isTokenDisabled,
		...tokenInputs
	} = useTrnTokenInputs(state, setToken);

	const { trnApi } = useTrnApi();
	const { userSession } = useWallets();
	const { getTokenBalance } = useTrnTokens();
	const signer = useFutureverseSigner();
	const customEx = useCustomExtrinsicBuilder({
		trnApi,
		walletAddress: userSession?.eoa ?? "",
		signer,
	});

	const ratioAmounts = useCallback(
		async ({ amount = tokenInputs[`${source.current}Amount`] }: { amount?: string }) => {
			if (!trnApi || !state.xToken || !state.yToken || !source.current) return;

			const fromToken = state[`${source.current}Token`]!;
			const toToken = state[`${source.current === "x" ? "y" : "x"}Token`]!;

			const fromBalance = new Balance(amount, fromToken, false);

			if (fromBalance.eq(0)) {
				setXAmount("");
				setYAmount("");
				updateState({
					ratio: undefined,
					yAmountMin: "",
				});
				return;
			}

			const result = parseJsonRpcResult<[number, number]>(
				await trnApi.rpc.dex[source.current === "y" ? "getAmountsIn" : "getAmountsOut"](
					fromBalance.toPlanckString(),
					[state.xToken.assetId, state.yToken.assetId]
				)
			);

			if (result.isErr()) return console.warn("Dex RPC error:", result.error.cause);

			const [calculatedFrom, calculatedTo] = result.value;

			const calculatedFromBalance = new Balance(calculatedFrom, fromToken);
			const toBalance = new Balance(calculatedTo, toToken);

			const otherBalance = source.current === "x" ? toBalance : calculatedFromBalance;

			const toAmountMin = otherBalance.multipliedBy(1 - +state.slippage / 100).integerValue();
			dexAmounts.current = { calculatedFromBalance, calculatedToBalance: toBalance, toAmountMin };

			if (source.current === "x") setYAmount(otherBalance.toUnit().toString());
			else setXAmount(otherBalance.toUnit().toString());

			const ratio = toFixed(
				toBalance.toUnit().dividedBy(calculatedFromBalance.toUnit()).toNumber()
			);

			updateState({
				ratio,
				yAmountMin: toAmountMin.toHuman(),
			});
		},
		[trnApi, state, tokenInputs, setYAmount, setXAmount]
	);

	const buildTransaction = useCallback(async () => {
		if (
			!trnApi ||
			!state.xToken ||
			!state.yToken ||
			!signer ||
			!userSession ||
			!dexAmounts.current ||
			!customEx
		)
			return;

		let tx = trnApi.tx.dex.swapWithExactSupply(
			dexAmounts.current.calculatedFromBalance.toPlanckString(),
			dexAmounts.current.toAmountMin.toPlanckString(),
			[state.xToken.assetId, state.yToken.assetId],
			null,
			null
		);

		let builder = await createBuilder(
			userSession,
			state.gasToken.assetId,
			state.slippage,
			customEx,
			tx
		);

		const { gasString } = await builder.getGasFees();
		const [gas] = gasString.split(" ");
		setEstimatedFee(gas);

		const gasBalance = await builder.checkBalance({
			walletAddress: userSession.futurepass,
			assetId: state.gasToken.assetId,
		});

		let canPay: boolean | undefined;
		let amountWithoutGas: Balance<TrnToken>;
		if (
			state.xToken.assetId === DEFAULT_GAS_TOKEN.assetId &&
			state.gasToken.assetId === DEFAULT_GAS_TOKEN.assetId
		) {
			const exchangeFees = getNetworkFee(dexAmounts.current.calculatedFromBalance.toNumber())
				.plus(getSwapFee(dexAmounts.current.calculatedFromBalance.toNumber()))
				.plus(+gas);
			amountWithoutGas = dexAmounts.current.calculatedFromBalance.minus(
				exchangeFees.pow(new BigNumber(10).times(state.gasToken.decimals))
			);
			canPay = amountWithoutGas.toUnit().toNumber() >= 0 ? true : false;
		} else {
			amountWithoutGas = dexAmounts.current.calculatedFromBalance;
			canPay = new Balance(+gasBalance.balance, gasBalance).toUnit().toNumber() - +gas >= 0;
		}

		setCanPayForGas(canPay);
		if (canPay === false) {
			return updateState({ error: `Insufficient ${state.gasToken.symbol} balance for gas fee` });
		}

		tx = trnApi.tx.dex.swapWithExactSupply(
			amountWithoutGas.toPlanckString().split(".")[0],
			dexAmounts.current.toAmountMin.toPlanckString(),
			[state.xToken.assetId, state.yToken.assetId],
			null,
			null
		);

		builder = await createBuilder(
			userSession,
			state.gasToken.assetId,
			state.slippage,
			customEx,
			tx
		);

		builtTx.current = builder;
	}, [trnApi, state, signer, userSession, customEx]);

	useMemo(async () => {
		await ratioAmounts({});
		buildTransaction();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [state.xToken, state.yToken, state.gasToken]);

	const setAmount = useCallback(
		async ({ src, amount }: { src: TokenSource; amount: string }) => {
			if (src === "x") {
				if (amount === "") {
					setYAmount("");
				}
				setXAmount(amount);
			} else {
				if (amount === "") {
					setXAmount("");
				}
				setYAmount(amount);
			}

			await ratioAmounts({ amount });
			buildTransaction();
		},
		[setXAmount, setYAmount, buildTransaction, ratioAmounts]
	);

	const setSlippage = useCallback(
		(slippage: string) => {
			const parsed = parseSlippage(slippage);

			if (typeof parsed !== "string") return;

			updateState({ slippage: parsed });

			buildTransaction();
		},
		[buildTransaction]
	);

	const switchTokens = useCallback(() => {
		updateState({
			xToken: state.yToken,
			yToken: state.xToken,
			gasToken: state.yToken ?? state.gasToken,
			ratio: undefined,
		});

		const y = tokenInputs.yAmount;
		setXAmount(y);
		setYAmount(tokenInputs.xAmount);
	}, [state, setXAmount, setYAmount, tokenInputs]);

	const signTransaction = useCallback(async () => {
		if (!builtTx.current) return;

		try {
			const result = await builtTx.current.signAndSend({
				onSend: () => {
					setTag("submitted");
				},
			});
			if (!result) return setTag(undefined);

			updateState({
				explorerUrl: `${ROOT_NETWORK.ExplorerUrl}/extrinsic/${formatRootscanId(result.extrinsicId)}`,
			});

			builtTx.current = undefined;
		} catch (err: any) {
			setTag("failed");
			updateState({
				error: err.message ?? err,
			});
		}
	}, [setTag]);

	const isDisabled = useMemo(() => {
		if (state.tag === "sign") return true;

		return isTokenDisabled || !!state.error || canPayForGas === false;
	}, [state, isTokenDisabled, canPayForGas]);

	const checkValidPool = useCheckValidPool();

	useEffect(() => {
		if (!state.xToken || !state.yToken || !tokenInputs.xAmount) return;

		checkValidPool([state.xToken.assetId, state.yToken.assetId]).then((isValid) => {
			let error = undefined;

			if (!isValid) error = "This pair is not valid yet. Choose another token to swap";

			updateState({ error: error });
		});
	}, [
		state.xToken,
		state.yToken,
		state.gasToken,
		estimatedFee,
		checkValidPool,
		getTokenBalance,
		tokenInputs.xAmount,
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
				ratioAmounts,
				switchTokens,
				estimatedFee,
				signTransaction,

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
