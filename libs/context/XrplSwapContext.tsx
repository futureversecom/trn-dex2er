import {
	createContext,
	type PropsWithChildren,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import type { Transaction, TrustSet } from "xrpl";

import type { ContextTag, TokenSource, XrplCurrency } from "@/libs/types";

import { DEFAULT_GAS_TOKEN } from "../constants";
import { useXrplTokenInputs, type XrplTokenInputs, type XrplTokenInputState } from "../hooks";
import {
	buildTx,
	getCurrency,
	getRatioAndAmounts,
	getXrplExplorerUrl,
	type InteractiveTransactionResponse,
	parseSlippage,
	toFixed,
	toHuman,
} from "../utils";
import { useWallets } from "./WalletContext";
import { useXrplCurrencies } from "./XrplCurrencyContext";

export type XrplSwapContextType = {
	resetState: () => void;
	setAmount: (args: { src: TokenSource; amount: string }) => void;
	setToken: (args: { src: TokenSource; token: XrplCurrency }) => void;
	setSlippage: (slippage: string) => void;
	ratio?: string;
	signTransaction: () => void;
	setTag: (tag?: ContextTag) => void;
	qr?: string;
	switchTokens: () => void;
	hasTrustlines: boolean;
} & XrplSwapState &
	Omit<XrplTokenInputs, "setXAmount" | "setYAmount">;

const XrplSwapContext = createContext<XrplSwapContextType>({} as XrplSwapContextType);

interface XrplSwapState extends XrplTokenInputState {
	tx?: Transaction;
	slippage: string;
	yAmountMin?: string;
	ratio?: string;
	tag?: ContextTag;
	explorerUrl?: string;
	error?: string;
	feeError?: string;
	priceDifference?: number;
	qr?: string;
	estimatedFee?: string;
}

const initialState = {
	slippage: "5",
	xAmount: "",
	yAmount: "",
} as XrplSwapState;

export function XrplSwapProvider({ children }: PropsWithChildren) {
	const [state, setState] = useState<XrplSwapState>(initialState);

	const updateState = (update: Partial<XrplSwapState>) =>
		setState((prev) => ({ ...prev, ...update }));

	const resetState = () => setState(initialState);

	const setTag = useCallback((tag?: ContextTag) => updateState({ tag }), []);

	const setToken = useCallback(({ src, token }: { src: TokenSource; token: XrplCurrency }) => {
		updateState({
			[`${src}Token`]: token,
		});
	}, []);

	const {
		setXAmount,
		setYAmount,
		isDisabled: isTokenDisabled,
		...tokenInputs
	} = useXrplTokenInputs(state, setToken);

	const { address, xrplProvider } = useWallets();
	const { getBalance, currencies, hasTrustline, refetch: refetchBalances } = useXrplCurrencies();

	const buildTransaction = useCallback(
		async ({
			src,
			amount = tokenInputs[`${src}Amount`],
			slippage = state.slippage,
		}: {
			src: TokenSource;
			amount?: string;
			slippage?: string;
		}) => {
			if (!address || !xrplProvider || !state.xToken || !state.yToken) return;

			const otherSrc = src === "x" ? "y" : "x";

			const fromToken = getCurrency(state[`${src}Token`]!);
			const toToken = getCurrency(state[`${otherSrc}Token`]!);

			const result = await getRatioAndAmounts(
				xrplProvider,
				fromToken,
				toToken,
				amount,
				src === "x" ? "from" : "to",
				+slippage
			);

			if (!result) {
				if (src === "x") setYAmount("");
				else setXAmount("");

				return updateState({
					ratio: undefined,
				});
			}

			const tx = buildTx(
				address,
				fromToken,
				result.fromAmount,
				toToken,
				result.toAmount,
				result.amountMin
			);
			const ratio =
				fromToken.currency === "XRP"
					? result.ratio * 1000000
					: toToken.currency === "XRP"
						? result.ratio / 1000000
						: result.ratio;

			const otherAmount = result.toAmount;

			if (src === "x") setYAmount(otherAmount);
			else setXAmount(otherAmount);

			return updateState({
				tx,
				ratio: toFixed(ratio, 6),
				yAmountMin: +result.amountMin <= 0 ? "" : result.amountMin,
				estimatedFee: toHuman(result.tradingFee.toString(), DEFAULT_GAS_TOKEN),
			});
		},
		[address, xrplProvider, state, tokenInputs, setXAmount, setYAmount]
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
			void buildTransaction({
				src: "x",
				slippage: parsed,
			});
		},
		[buildTransaction]
	);

	const switchTokens = useCallback(() => {
		updateState({
			xToken: state.yToken,
			yToken: state.xToken,
			ratio: undefined,
			tx: undefined,
		});

		setXAmount("");
		setYAmount("");
	}, [state, setXAmount, setYAmount]);

	const hasTrustlines = useMemo(() => {
		if (!state.yToken || !state.xToken) return true;

		return hasTrustline(state.xToken) && hasTrustline(state.yToken);
	}, [state.xToken, state.yToken, hasTrustline]);

	const signTransaction = useCallback(async () => {
		if (!state.tx || !xrplProvider || !state.xToken || !state.yToken) return;

		let tx: Transaction = state.tx;
		if (!hasTrustlines) {
			const currency = !hasTrustline(state.xToken) ? state.xToken : state.yToken;

			tx = {
				TransactionType: "TrustSet",
				Account: address,
				LimitAmount: {
					issuer: currency.issuer,
					currency: currency.currency,
					value: "1000000",
				},
			} as TrustSet;
		}

		xrplProvider
			.signTransaction(tx, (response: InteractiveTransactionResponse) => {
				if (response.status === "pending") {
					if (response.qrPng) updateState({ qr: response.qrPng });
					setTag("sign");
				} else if (response.status === "success") {
					refetchBalances().then(() => setTag("submitted"));
					updateState({
						explorerUrl: `${getXrplExplorerUrl("Swap")}/transactions/${response.hash}`,
					});
				} else {
					setTag("failed");
				}
			})
			.catch((err) => {
				console.log("err", err);
			});
	}, [state, setTag, xrplProvider, hasTrustline, hasTrustlines, address, refetchBalances]);

	const isDisabled = useMemo(() => {
		if (state.tag === "sign") return true;

		return isTokenDisabled || !!state.error;
	}, [state, isTokenDisabled]);

	useEffect(() => {
		if (!state.xToken || !state.yToken || !state.estimatedFee) return;

		let error = "";

		const xrpBalance = getBalance(currencies.find((c) => c.currency === "XRP"))?.value;
		if (!xrpBalance) return;

		if (
			+xrpBalance < +state.estimatedFee ||
			(state.xToken.currency === "XRP" && +xrpBalance - +tokenInputs.xAmount < +state.estimatedFee)
		)
			error = "Insufficient XRP balance for gas fee";

		updateState({ error });
	}, [
		state.xToken,
		state.yToken,
		state.estimatedFee,
		currencies,
		getBalance,
		tokenInputs.xAmount,
		tokenInputs.yAmount,
	]);

	return (
		<XrplSwapContext.Provider
			value={{
				resetState,
				setAmount,
				setToken,
				setTag,
				setSlippage,
				switchTokens,
				signTransaction,
				hasTrustlines,

				isDisabled,

				...state,
				...tokenInputs,
			}}
		>
			{children}
		</XrplSwapContext.Provider>
	);
}

export function useXrplSwap() {
	return useContext(XrplSwapContext);
}
