import {
	createContext,
	type PropsWithChildren,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { Amount, dropsToXrp, Payment, type Transaction, xrpToDrops } from "xrpl";
import { isIssuedCurrency } from "xrpl/dist/npm/models/transactions/common";

import type { ContextTag, TokenSource, XrplCurrency } from "@/libs/types";

import { DEFAULT_GAS_TOKEN } from "../constants";
import { useXrplTokenInputs, type XrplTokenInputs, type XrplTokenInputState } from "../hooks";
import {
	checkAmmExists,
	getAmmInfo,
	getXrplExplorerUrl,
	type InteractiveTransactionResponse,
	parseSlippage,
	toFixed,
	toHuman,
	xrplCurrencytoCurrency,
} from "../utils";
import { useWallets } from "./WalletContext";
import { useXrplCurrencies } from "./XrplCurrencyContext";

type sourceType = "x" | "y";
type dexTxType = "exactSupply" | "exactTarget";

export type XrplSwapContextType = {
	resetState: () => void;
	switchTokens: () => void;
	signTransaction: () => void;
	setSrc: (src: sourceType) => void;
	setTag: (tag?: ContextTag) => void;
	buildTransaction: () => Promise<void>;
	setSlippage: (slippage: string) => void;
	setAmount: (args: { src: TokenSource; amount: string }) => void;
	setToken: (args: { src: TokenSource; token: XrplCurrency }) => void;
	qr?: string;
	ratio?: string;
} & XrplSwapState &
	Omit<XrplTokenInputs, "setXAmount" | "setYAmount" | "refetchTokenBalances">;

const XrplSwapContext = createContext<XrplSwapContextType>({} as XrplSwapContextType);

interface XrplSwapState extends XrplTokenInputState {
	qr?: string;
	ratio?: string;
	error?: string;
	tx?: Transaction;
	tag?: ContextTag;
	dexTx: dexTxType;
	slippage: string;
	source: sourceType;
	tradingFee?: number;
	xAmountMax?: string;
	yAmountMin?: string;
	validPool?: boolean;
	explorerUrl?: string;
	xAmountRatio?: string;
	yAmountRatio?: string;
	estimatedFee?: string;
	priceDifference?: number;
	xAssetLiquidity?: number;
	yAssetLiquidity?: number;
}

const initialState = {
	source: "x",
	xAmount: "",
	yAmount: "",
	slippage: "5",
	dexTx: "exactSupply",
} as XrplSwapState;

export function XrplSwapProvider({ children }: PropsWithChildren) {
	const [state, setState] = useState<XrplSwapState>(initialState);

	const updateState = (update: Partial<XrplSwapState>) =>
		setState((prev) => ({ ...prev, ...update }));

	const setTag = useCallback((tag?: ContextTag) => updateState({ tag }), []);
	const setSrc = useCallback((source: sourceType) => updateState({ source }), []);
	const setDexTx = useCallback((dexTx: dexTxType) => updateState({ dexTx }), []);
	const setValidPool = useCallback((validPool?: boolean) => updateState({ validPool }), []);
	const setXAssetLiquidity = useCallback(
		(xAssetLiquidity?: number) => updateState({ xAssetLiquidity }),
		[]
	);
	const setYAssetLiquidity = useCallback(
		(yAssetLiquidity?: number) => updateState({ yAssetLiquidity }),
		[]
	);
	const setToken = useCallback(
		({ src, token }: { src: TokenSource; token: XrplCurrency }) =>
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
	} = useXrplTokenInputs(state, setToken);

	const resetState = useCallback(() => {
		setState(initialState);
		setXAmount("");
		setYAmount("");
	}, [setXAmount, setYAmount]);

	const { address, xrplProvider } = useWallets();
	const { getBalance, currencies } = useXrplCurrencies();

	useEffect(() => {
		void (async () => {
			if (!state.xToken || !state.yToken || !xrplProvider) return;

			const sourceBalance = +tokenInputs[`${state.source}Amount`];
			if (sourceBalance === 0) {
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

			const amm_info = await getAmmInfo(xrplProvider, state.xToken, state.yToken);
			const xAssetLiquidity = isIssuedCurrency(amm_info.result.amm.amount)
				? Number(amm_info.result.amm.amount.value)
				: Number(dropsToXrp(amm_info.result.amm.amount));
			const yAssetLiquidity = isIssuedCurrency(amm_info.result.amm.amount2)
				? Number(amm_info.result.amm.amount2.value)
				: Number(dropsToXrp(amm_info.result.amm.amount2));
			const tradingFeePercentage = amm_info.result.amm.trading_fee / 100000; // Normalize trading fee to a percentage

			setXAssetLiquidity(xAssetLiquidity);
			setYAssetLiquidity(yAssetLiquidity);

			if (state.source === "x") {
				const ratio = yAssetLiquidity / xAssetLiquidity;
				const yAmount = sourceBalance * ratio;
				setYAmount(yAmount.toString());
				updateState({
					xAmountRatio: sourceBalance.toString(),
					yAmountRatio: yAmount.toString(),
					ratio: ratio.toString(),
					tradingFee: tradingFeePercentage,
					estimatedFee: toHuman(tradingFeePercentage.toString(), DEFAULT_GAS_TOKEN),
				});
			} else {
				const ratio = xAssetLiquidity / yAssetLiquidity;
				const xAmount = sourceBalance * ratio;
				setXAmount(xAmount.toString());
				updateState({
					xAmountRatio: xAmount.toString(),
					yAmountRatio: sourceBalance.toString(),
					ratio: ratio.toString(),
					tradingFee: tradingFeePercentage,
					estimatedFee: toHuman(tradingFeePercentage.toString(), DEFAULT_GAS_TOKEN),
				});
			}
		})();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		setXAmount,
		setYAmount,
		state.xToken,
		state.yToken,
		xrplProvider,
		setValidPool,
		tokenInputs.xAmount,
		tokenInputs.yAmount,
	]);

	const yAmountMin = useMemo(() => {
		if (!state.yAmountRatio) return;
		return (+state.yAmountRatio * (1 - +state.slippage / 100)).toString();
	}, [state.slippage, state.yAmountRatio]);

	const xAmountMax = useMemo(() => {
		if (!state.xAmountRatio) return;
		return (
			+state.xAmountRatio * (1 - (1 - +state.slippage / 100)) +
			+state.xAmountRatio
		).toString();
	}, [state.slippage, state.xAmountRatio]);

	const sufficientLiquidity = useMemo(() => {
		if (
			!state.xAssetLiquidity ||
			!state.yAssetLiquidity ||
			!tokenInputs.xAmount ||
			!tokenInputs.yAmount ||
			!yAmountMin
		)
			return;

		const productOfReserves = state.xAssetLiquidity * state.yAssetLiquidity; // Constant Product Model
		const xNewReserve = state.xAssetLiquidity + +tokenInputs.xAmount;
		const yNewReserve = productOfReserves / xNewReserve;
		const yAmountAvailable = state.yAssetLiquidity - yNewReserve; // Calulcates how many units of ytoken can be provided

		if (yAmountAvailable > +yAmountMin) {
			return true;
		} else {
			return false;
		}
	}, [
		state.xAssetLiquidity,
		state.yAssetLiquidity,
		tokenInputs.xAmount,
		tokenInputs.yAmount,
		yAmountMin,
	]);

	const swapTx = useMemo(() => {
		if (
			!state.xAmountRatio ||
			!state.yAmountRatio ||
			!state.xToken ||
			!state.yToken ||
			!xAmountMax ||
			!yAmountMin ||
			!address
		)
			return;

		let sendMax;
		let deliverMinAmount;
		if (state.source === "x") {
			sendMax =
				state.xToken.currency === "XRP"
					? (xrpToDrops(toFixed(+state.xAmountRatio, 6)) as Amount)
					: ({
							currency: state.xToken.currency,
							issuer: state.xToken.issuer,
							value: toFixed(+state.xAmountRatio, 15 - +state.xAmountRatio.split(".")[0].length),
						} as Amount);
			deliverMinAmount =
				state.yToken.currency === "XRP"
					? (xrpToDrops(toFixed(+yAmountMin, 6)) as Amount)
					: ({
							currency: state.yToken.currency,
							issuer: state.yToken.issuer,
							value: toFixed(+yAmountMin, 15 - +yAmountMin.split(".")[0].length),
						} as Amount);
		} else if (state.source === "y") {
			sendMax =
				state.xToken.currency === "XRP"
					? (xrpToDrops(toFixed(+xAmountMax, 6)) as Amount)
					: ({
							currency: state.xToken.currency,
							issuer: state.xToken.issuer,
							value: toFixed(+xAmountMax, 15 - +xAmountMax.split(".")[0].length),
						} as Amount);
			deliverMinAmount =
				state.yToken.currency === "XRP"
					? (xrpToDrops(toFixed(+state.yAmountRatio, 6)) as Amount)
					: ({
							currency: state.yToken.currency,
							issuer: state.yToken.issuer,
							value: toFixed(+state.yAmountRatio, 15 - +state.yAmountRatio.split(".")[0].length),
						} as Amount);
		}
		const deliverAmount =
			state.yToken.currency === "XRP"
				? (xrpToDrops(toFixed(+state.yAmountRatio, 6)) as Amount)
				: ({
						currency: state.yToken.currency,
						issuer: state.yToken.issuer,
						value: toFixed(+state.yAmountRatio, 15 - +state.yAmountRatio.split(".")[0].length),
					} as Amount);

		const crossCurrencyPaymentTx: Payment = {
			TransactionType: "Payment",
			Account: address,
			Amount: deliverAmount,
			DeliverMin: deliverMinAmount,
			Destination: address,
			SendMax: sendMax,
			Flags: {
				tfPartialPayment: true,
			},
		};

		return crossCurrencyPaymentTx;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		state.xAmountRatio,
		state.yAmountRatio,
		state.xToken,
		state.yToken,
		xAmountMax,
		yAmountMin,
		address,
	]);

	const buildTransaction = useCallback(async () => {
		if (!address || !xrplProvider || !state.xToken || !state.yToken) return;

		updateState({ tx: swapTx });
	}, [swapTx, address, xrplProvider, state.xToken, state.yToken]);

	const setAmount = useCallback(
		({ src, amount }: { src: TokenSource; amount: string }) => {
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
			updateState({ error: "" });
		},
		[setXAmount, setYAmount, setDexTx]
	);

	const setSlippage = useCallback((slippage: string) => {
		const parsed = parseSlippage(slippage);

		if (typeof parsed !== "string") return;

		updateState({ slippage: parsed });
	}, []);

	const switchTokens = useCallback(() => {
		updateState({
			xToken: state.yToken,
			yToken: state.xToken,
			tx: undefined,
		});

		if (state.source === "x") {
			setYAmount(tokenInputs.xAmount);
			setSrc("y");
			setDexTx("exactTarget");
		} else {
			setXAmount(tokenInputs.yAmount);
			setSrc("x");
			setDexTx("exactSupply");
		}
	}, [state, setXAmount, setYAmount, tokenInputs, setSrc, setDexTx]);

	const signTransaction = useCallback(async () => {
		console.log("tx to sign ", state.tx);
		if (!state.tx || !xrplProvider || !state.xToken || !state.yToken) return;

		const tx: Transaction = state.tx;
		xrplProvider
			.signTransaction(tx, (response: InteractiveTransactionResponse) => {
				if (response.status === "pending") {
					if (response.qrPng) updateState({ qr: response.qrPng });
					setTag("sign");
				} else if (response.status === "success") {
					refetchTokenBalances();
					setTag("submitted");
					updateState({
						explorerUrl: `${getXrplExplorerUrl("Swap")}/transactions/${response.hash}`,
					});
				} else {
					setTag("failed");
				}
			})
			.catch((err) => {
				console.log("could not sign XRPL transaction", err);
			});
	}, [state, setTag, xrplProvider, refetchTokenBalances]);

	const isDisabled = useMemo(() => {
		if (state.tag === "sign") return true;

		return isTokenDisabled || !!state.error;
	}, [state, isTokenDisabled]);

	useEffect(() => {
		const checkErrors = async () => {
			if (!state.xToken || !state.yToken || !xrplProvider) return;

			let error = "";

			const valid = await checkAmmExists(
				xrplProvider,
				xrplCurrencytoCurrency(state.xToken),
				xrplCurrencytoCurrency(state.yToken)
			);
			if (!valid) {
				return updateState({ error: "This pair is not valid yet. Choose another token to swap" });
			}

			if (sufficientLiquidity === false) {
				return updateState({ error: "This pair has insufficient liquidity for this trade" });
			}

			const xrpBalance = getBalance(currencies.find((c) => c.currency === "XRP"))?.value;
			if (!xrpBalance) return;

			if (!state.estimatedFee) return;

			if (
				+xrpBalance < +state.estimatedFee ||
				(state.xToken.currency === "XRP" &&
					+xrpBalance - +tokenInputs.xAmount < +state.estimatedFee)
			)
				error = "Insufficient XRP balance for gas fee";

			updateState({ error });
		};
		void checkErrors();
	}, [
		currencies,
		getBalance,
		xrplProvider,
		state.xToken,
		state.yToken,
		state.validPool,
		state.estimatedFee,
		tokenInputs.xAmount,
		tokenInputs.yAmount,
		sufficientLiquidity,
	]);

	return (
		<XrplSwapContext.Provider
			value={{
				setTag,
				setSrc,
				setToken,
				setAmount,
				resetState,
				isDisabled,
				setSlippage,
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
		</XrplSwapContext.Provider>
	);
}

export function useXrplSwap() {
	return useContext(XrplSwapContext);
}
