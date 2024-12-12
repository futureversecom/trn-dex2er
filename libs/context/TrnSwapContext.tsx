import { useFutureverseSigner } from "@futureverse/auth-react";
import { CustomExtrinsicBuilder, TransactionBuilder } from "@futureverse/transact";
import { useTrnApi } from "@futureverse/transact-react";
import { parseJsonRpcResult } from "@therootnetwork/extrinsic";
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
import {
	type TrnTokenInputs,
	type TrnTokenInputState,
	useCheckValidPool,
	useTrnTokenInputs,
} from "../hooks";
import { formatRootscanId } from "../utils";
import { Balance, parseSlippage, toFixed } from "../utils";
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
	setAmount: (args: { src: TokenSource; amount: string }) => void;
	setToken: (args: { src: TokenSource; token: TrnToken }) => void;
	estimatedFee?: string;
	ratio?: string;
} & TrnSwapState &
	Omit<TrnTokenInputs, "setXAmount" | "setYAmount">;

const TrnSwapContext = createContext<TrnSwapContextType>({} as TrnSwapContextType);

interface TrnSwapState extends TrnTokenInputState {
	builder?: CustomExtrinsicBuilder;
	gasToken: TrnToken;
	slippage: string;
	yAmountMin?: string;
	ratio?: string;
	tag?: ContextTag;
	explorerUrl?: string;
	error?: string;
	feeError?: string;
	priceDifference?: number;
	src: "x" | "y";
}

const initialState = {
	slippage: "5",
	xAmount: "",
	yAmount: "",
	gasToken: DEFAULT_GAS_TOKEN,
	src: "x",
} as TrnSwapState;

export function TrnSwapProvider({ children }: PropsWithChildren) {
	const [state, setState] = useState<TrnSwapState>(initialState);
	const [estimatedFee, setEstimatedFee] = useState<string>();
	const [canPayForGas, setCanPayForGas] = useState<boolean>();
	const builtTx = useRef<CustomExtrinsicBuilder>();

	const updateState = (update: Partial<TrnSwapState>) =>
		setState((prev) => ({ ...prev, ...update }));

	const resetState = () => setState(initialState);

	const setSrc = useCallback((src: "x" | "y") => updateState({ src }), []);

	const setTag = useCallback((tag?: ContextTag) => updateState({ tag }), []);

	const setGasToken = useCallback((gasToken: TrnToken) => updateState({ gasToken }), []);

	const setToken = useCallback(({ src, token }: { src: TokenSource; token: TrnToken }) => {
		if (src === "x")
			return updateState({
				xToken: token,
				gasToken: token,
			});

		updateState({
			yToken: token,
		});
	}, []);

	const setBuilder = useCallback((builder: CustomExtrinsicBuilder) => updateState({ builder }), []);

	const {
		setXAmount,
		setYAmount,
		isDisabled: isTokenDisabled,
		...tokenInputs
	} = useTrnTokenInputs(state, setToken);

	const { trnApi } = useTrnApi();
	const signer = useFutureverseSigner();
	const { userSession } = useWallets();
	const { getTokenBalance } = useTrnTokens();

	useMemo(() => {
		const execute = async () => {
			if (!state.builder || !userSession) return;
			if (state.gasToken.assetId === DEFAULT_GAS_TOKEN.assetId) {
				// TODO 768 why doesn't this work ?
				try {
					await state.builder.addFuturePass(userSession.futurepass);
				} catch (err: any) {
					console.info(err);
				}
			} else {
				try {
					await state.builder.addFuturePassAndFeeProxy({
						futurePass: userSession.futurepass,
						assetId: state.gasToken.assetId,
						slippage: +state.slippage,
					});
				} catch (err: any) {
					console.info(err);
				}
			}

			builtTx.current = state.builder;

			const { gasString } = await state.builder.getGasFees();
			const [gas] = gasString.split(" ");
			setEstimatedFee(gas);

			const gasBalance = await state.builder.checkBalance({
				walletAddress: userSession.futurepass,
				assetId: state.gasToken.assetId,
			});
			const gasTokenBalance = new Balance(+gasBalance.balance, gasBalance);

			let canPay: boolean | undefined;

			// XRP ASSET ID
			if (state.gasToken.assetId === DEFAULT_GAS_TOKEN.assetId) {
				const total =
					state.xToken?.assetId === DEFAULT_GAS_TOKEN.assetId
						? +gas + +tokenInputs.xAmount
						: state.yToken?.assetId === DEFAULT_GAS_TOKEN.assetId
							? +gas + +tokenInputs.yAmount
							: 0;
				canPay = +gasTokenBalance.toUnit() > total;
			}

			// ROOT ASSET ID
			if (state.gasToken.assetId === 1) {
				const total =
					state.xToken?.assetId === 1
						? +gas + +tokenInputs.xAmount
						: state.yToken?.assetId === 1
							? +gas + +tokenInputs.yAmount
							: 0;
				canPay = +gasTokenBalance.toUnit() > total;
			}

			if (canPay === false) {
				updateState({ error: `Insufficient ${state.gasToken.symbol} balance for gas fee` });
			}
			setCanPayForGas(canPay);
		};

		execute();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [state.builder, userSession, state.gasToken]);

	const buildTransaction = useCallback(
		async ({
			src = state[`src`],
			amount = tokenInputs[`${src}Amount`],
			slippage = state.slippage,
		}: {
			src?: TokenSource;
			amount?: string;
			slippage?: string;
		}) => {
			if (!trnApi || !state.xToken || !state.yToken || !signer || !userSession) return;

			const fromToken = state[`${src}Token`]!;
			const toToken = state[`${src === "x" ? "y" : "x"}Token`]!;

			const fromBalance = new Balance(amount, fromToken, false);

			if (fromBalance.eq(0))
				return updateState({
					builder: undefined,
					ratio: undefined,
					yAmountMin: "",
				});

			const result = parseJsonRpcResult<[number, number]>(
				await trnApi.rpc.dex[src === "y" ? "getAmountsIn" : "getAmountsOut"](
					fromBalance.toPlanckString(),
					[state.xToken.assetId, state.yToken.assetId]
				)
			);

			if (result.isErr()) return console.warn("Dex RPC error:", result.error.cause);

			const [calculatedFrom, calculatedTo] = result.value;

			const calculatedFromBalance = new Balance(calculatedFrom, fromToken);
			const toBalance = new Balance(calculatedTo, toToken);

			const otherBalance = src === "x" ? toBalance : calculatedFromBalance;

			const toAmountMin = otherBalance.multipliedBy(1 - +slippage / 100).integerValue();

			const tx = trnApi.tx.dex.swapWithExactSupply(
				calculatedFromBalance.toPlanckString(),
				toAmountMin.toPlanckString(),
				[state.xToken.assetId, state.yToken.assetId],
				null,
				null
			);

			const ratio = toFixed(
				toBalance.toUnit().dividedBy(calculatedFromBalance.toUnit()).toNumber()
			);

			if (src === "x") setYAmount(otherBalance.toUnit().toString());
			else setXAmount(otherBalance.toUnit().toString());

			const builder = TransactionBuilder.custom(trnApi, signer, userSession.eoa);
			const fromEx = builder.fromExtrinsic(tx);

			setBuilder(fromEx);

			updateState({
				ratio,
				yAmountMin: toAmountMin.toHuman(),
			});
		},
		[tokenInputs, state, trnApi, signer, userSession, setYAmount, setXAmount, setBuilder]
	);

	const setAmount = useCallback(
		({ src, amount }: { src: TokenSource; amount: string }) => {
			if (src === "x") setXAmount(amount);
			else setYAmount(amount);

			buildTransaction({ src, amount });
		},
		[setXAmount, setYAmount, buildTransaction]
	);

	const setSlippage = useCallback(
		(slippage: string) => {
			const parsed = parseSlippage(slippage);

			if (typeof parsed !== "string") return;

			updateState({ slippage: parsed });
			buildTransaction({
				slippage: parsed,
			});
		},
		[buildTransaction]
	);

	const switchTokens = useCallback(() => {
		updateState({
			xToken: state.yToken,
			yToken: state.xToken,
			gasToken: state.yToken ?? state.gasToken,
			ratio: undefined,
			builder: undefined,
		});

		setXAmount("");
		setYAmount("");
	}, [state, setXAmount, setYAmount]);

	const signTransaction = useCallback(async () => {
		if (!builtTx.current) return;

		const onSend = () => {
			setTag("submitted");
		};

		try {
			const result = await builtTx.current.signAndSend({ onSend });
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
			let error = "";

			if (!isValid) error = "This pair is not valid yet. Choose another token to swap";

			updateState({ error });
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
				resetState,
				setAmount,
				setToken,
				setTag,
				setSlippage,
				switchTokens,
				setGasToken,
				setSrc,

				signTransaction,

				isDisabled,

				estimatedFee,

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
