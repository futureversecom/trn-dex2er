import * as sdk from "@futureverse/experience-sdk";
import { useTrnApi } from "@futureverse/transact-react";
import {
	createContext,
	type PropsWithChildren,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";

import type { ContextTag, TokenSource, TrnToken, XamanData } from "@/libs/types";

import { DEFAULT_GAS_TOKEN, ROOT_NETWORK } from "../constants";
import {
	type TrnTokenInputs,
	type TrnTokenInputState,
	useCheckValidPool,
	useExtrinsic,
	useTrnTokenInputs,
} from "../hooks";
import { useAuthenticationMethod } from "../hooks";
import { Balance, formatRootscanId, parseSlippage, toFixed } from "../utils";
import { useTrnTokens } from "./TrnTokenContext";
import { useWallets } from "./WalletContext";

export type TrnSwapContextType = {
	resetState: () => void;
	setAmount: (args: { src: TokenSource; amount: string }) => void;
	setToken: (args: { src: TokenSource; token: TrnToken }) => void;
	setSlippage: (slippage: string) => void;
	ratio?: string;
	signTransaction: () => void;
	setTag: (tag?: ContextTag) => void;
	xamanData?: XamanData;
	switchTokens: () => void;
	setGasToken: (gasToken: TrnToken) => void;
	estimatedFee?: string;
} & TrnSwapState &
	Omit<TrnTokenInputs, "setXAmount" | "setYAmount">;

const TrnSwapContext = createContext<TrnSwapContextType>({} as TrnSwapContextType);

interface TrnSwapState extends TrnTokenInputState {
	tx?: sdk.Extrinsic;
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

	const updateState = (update: Partial<TrnSwapState>) =>
		setState((prev) => ({ ...prev, ...update }));

	const resetState = () => setState(initialState);

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

	const {
		setXAmount,
		setYAmount,
		isDisabled: isTokenDisabled,
		...tokenInputs
	} = useTrnTokenInputs(state, setToken);

	const { trnApi } = useTrnApi();
	const { userSession } = useWallets();
	const { getTokenBalance } = useTrnTokens();
	const authenticationMethod = useAuthenticationMethod();

	const futurepass = userSession?.futurepass as string | undefined;

	const { estimateFee, submitExtrinsic, xamanData } = useExtrinsic({
		extrinsic: state.tx,
		senderAddress: futurepass,
		feeOptions: {
			assetId: state.gasToken.assetId,
			slippage: +state.slippage / 100,
		},
	});

	useEffect(() => {
		if (!state.tx) return;

		estimateFee()
			.then((gasFee) => setEstimatedFee(new Balance(gasFee, state.gasToken).toHuman()))
			.catch(({ cause }: Error) => {
				if (!cause) return;

				updateState({
					gasToken: DEFAULT_GAS_TOKEN,
				});
			});
	}, [state.tx, state.gasToken, estimateFee]);

	const buildTransaction = useCallback(
		async ({
			src,
			amount,
			slippage = state.slippage,
		}: {
			src: TokenSource;
			amount: string;
			slippage?: string;
		}) => {
			if (!trnApi || !state.xToken || !state.yToken) return;

			const fromToken = state[`${src}Token`]!;
			const toToken = state[`${src === "x" ? "y" : "x"}Token`]!;

			const fromBalance = new Balance(amount, fromToken, false);

			if (fromBalance.eq(0))
				return updateState({
					tx: undefined,
					ratio: undefined,
					yAmountMin: "",
				});

			const result = sdk.parseJsonRpcResult<[number, number]>(
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

			updateState({
				tx,
				ratio,
				yAmountMin: toAmountMin.toHuman(),
			});
		},
		[trnApi, state, setXAmount, setYAmount]
	);

	const setAmount = useCallback(
		({ src, amount }: { src: TokenSource; amount: string }) => {
			if (src === "x") setXAmount(amount);
			else setYAmount(amount);

			void buildTransaction({ src, amount });
		},
		[setXAmount, setYAmount, buildTransaction]
	);

	const setSlippage = useCallback(
		(slippage: string) => {
			const parsed = parseSlippage(slippage);

			if (typeof parsed !== "string") return;

			updateState({ slippage: parsed });
			buildTransaction({
				src: "x",
				amount: tokenInputs.xAmount,
				slippage: parsed,
			});
		},
		[tokenInputs.xAmount, buildTransaction]
	);

	const switchTokens = useCallback(() => {
		updateState({
			xToken: state.yToken,
			yToken: state.xToken,
			gasToken: state.yToken ?? state.gasToken,
			ratio: undefined,
			tx: undefined,
		});

		setXAmount("");
		setYAmount("");
	}, [state, setXAmount, setYAmount]);

	const signTransaction = useCallback(async () => {
		if (!state.tx) return;

		try {
			const res = await submitExtrinsic(state.tx);
			if (!res) return setTag(undefined);

			setTag("submitted");
			updateState({
				explorerUrl: `${ROOT_NETWORK.ExplorerUrl}/extrinsic/${formatRootscanId(res.extrinsicId)}`,
			});
		} catch (err: any) {
			setTag("failed");
			updateState({
				error: err.message ?? err,
			});
		}
	}, [state.tx, setTag, submitExtrinsic]);

	useEffect(() => {
		switch (xamanData?.progress) {
			case "onCreated":
				return setTag("sign");
			case "onSignatureSuccess":
				return setTag("submit");
		}
	}, [authenticationMethod?.method, xamanData?.progress, setTag]);

	const isDisabled = useMemo(() => {
		if (state.tag === "sign") return true;

		return isTokenDisabled || !!state.error;
	}, [state, isTokenDisabled]);

	const checkValidPool = useCheckValidPool();

	useEffect(() => {
		if (!state.xToken || !state.yToken || !tokenInputs.xAmount) return;

		checkValidPool([state.xToken.assetId, state.yToken.assetId]).then((isValid) => {
			let error = "";

			if (estimatedFee) {
				const gasTokenBalance = getTokenBalance(state.gasToken);

				if (
					(state.gasToken.symbol === "XRP" && gasTokenBalance?.toUnit().lt(+estimatedFee)) ||
					(state.gasToken.symbol === state.xToken!.symbol &&
						gasTokenBalance?.toUnit().lt(+tokenInputs.xAmount + +estimatedFee))
				)
					error = `Insufficient ${state.gasToken.symbol} balance for gas fee`;
			}

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

				xamanData,
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
