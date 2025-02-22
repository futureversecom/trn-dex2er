import { useQuery } from "@tanstack/react-query";
import {
	createContext,
	type PropsWithChildren,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";
import { Currency, Transaction } from "xrpl";

import type { ContextTag, TokenSource, XrplCurrency } from "@/libs/types";

import { useWallets, useXrplCurrencies } from ".";
import { useXrplTokenInputs, XrplTokenInputs, XrplTokenInputState } from "../hooks";
import {
	buildCreateAmmTx,
	buildDepositAmmTx,
	buildSingleAssetDepositTx,
	checkAmmExists,
	formatTxInput,
	getAmmcost,
	getCurrency,
	getXrplExplorerUrl,
	InteractiveTransactionResponse,
	normalizeCurrencyCode,
	xrplCurrencytoCurrency,
} from "../utils";

export type AddLiquidityXrplContextType = {
	resetState: () => void;
	onPoolClick: (xToken: XrplCurrency, yToken: XrplCurrency) => void;
	setAmount: (args: { src: TokenSource; amount: string }) => void;
	setToken: (args: { src: TokenSource; token: XrplCurrency }) => void;
	signTransaction: () => void;
	setTag: (tag?: ContextTag) => void;
	setTradingFee: (fee: string) => void;
	tradingFee?: number;
	toggleSingleAssetDeposit: () => void;
} & AddLiquidityStateXrpl &
	Omit<XrplTokenInputs, "setXAmount" | "setYAmount">;

const AddLiquidityXrplContext = createContext<AddLiquidityXrplContextType>(
	{} as AddLiquidityXrplContextType
);

interface AddLiquidityStateXrpl extends XrplTokenInputState {
	tx?: Transaction;
	tag?: ContextTag;
	explorerUrl?: string;
	error?: string;
	estPoolShare?: number;
	action: "add" | "addSingle" | "create";
	tradingFee: number;
	tradingFeeError?: string;
	qr?: string;
	ammExists?: boolean;
}

const initialState = {
	action: "create",
	tradingFee: 0,
} as AddLiquidityStateXrpl;

export function AddLiquidityXrplProvider({ children }: PropsWithChildren) {
	const [state, setState] = useState<AddLiquidityStateXrpl>(initialState);
	const { address, xrplProvider } = useWallets();
	const { pools, refetch: refetchBalances } = useXrplCurrencies();

	const updateState = (update: Partial<AddLiquidityStateXrpl>) =>
		setState((prev) => ({ ...prev, ...update }));

	const setTag = useCallback((tag?: ContextTag) => updateState({ tag }), []);

	const setToken = useCallback(({ src, token }: { src: TokenSource; token: XrplCurrency }) => {
		updateState({
			[`${src}Token`]: token,
		});
	}, []);

	const { data: ammCost } = useQuery({
		queryKey: ["amm_cost"],
		queryFn: () => getAmmcost(xrplProvider),
		enabled: !!xrplProvider,
	});

	const toggleSingleAssetDeposit = useCallback(() => {
		return state.action === "add"
			? updateState({ action: "addSingle" })
			: updateState({ action: "add" });
	}, [state.action]);

	const {
		setXAmount,
		setYAmount,
		isDisabled: isTokenDisabled,
		...tokenInputs
	} = useXrplTokenInputs(state, setToken, undefined, state.action === "addSingle");

	useMemo(() => {
		void (async () => {
			const xToken = tokenInputs[`xToken`];
			const yToken = tokenInputs[`yToken`];

			if (!xToken || !yToken || !xrplProvider) return;

			const assetOne: Currency = xrplCurrencytoCurrency(xToken);
			const assetTwo: Currency = xrplCurrencytoCurrency(yToken);

			const valid = await checkAmmExists(xrplProvider, assetOne, assetTwo);

			if (state.action === "add" && !valid) {
				return updateState({ action: "create", ammExists: valid });
			}
			if (state.action === "create" && valid) {
				return updateState({ action: "add", ammExists: valid });
			}
		})();
	}, [state.action, tokenInputs, xrplProvider]);

	const resetState = useCallback(() => {
		setState(initialState);
		setXAmount("");
		setYAmount("");
	}, [setXAmount, setYAmount]);

	const liquidityPool = useMemo(() => {
		if (!state.xToken || !state.yToken) return;

		const xToken = state.xToken;
		const yToken = state.yToken;

		return pools.find(({ poolKey }) => {
			const [x, y] = poolKey.split("-");

			const xCurrencyFormat = xToken.ticker || normalizeCurrencyCode(xToken.currency);
			const yCurrencyFormat = yToken.ticker || normalizeCurrencyCode(yToken.currency);

			return (
				(x === xCurrencyFormat && y === yCurrencyFormat) ||
				(x === yCurrencyFormat && y === xCurrencyFormat)
			);
		});
	}, [pools, state.xToken, state.yToken]);

	const onPoolClick = useCallback((xToken: XrplCurrency, yToken: XrplCurrency) => {
		updateState({ xToken, yToken });
	}, []);

	const isDisabled = useMemo(() => {
		if (state.tag === "sign") return true;

		return isTokenDisabled || !!state.error;
	}, [state, isTokenDisabled]);

	const buildTransaction = useCallback(
		({
			xAmount = tokenInputs[`xAmount`],
			yAmount = tokenInputs[`yAmount`],
		}: {
			xAmount?: string;
			yAmount?: string;
		}) => {
			if (!address || !state.xToken || !state.yToken || !xAmount || !yAmount) return;

			const xToken = getCurrency(state[`xToken`]!);
			const yToken = getCurrency(state[`yToken`]!);

			if (state.action === "add") {
				return updateState({
					tx: buildDepositAmmTx(
						address,
						formatTxInput(xToken, xAmount),
						formatTxInput(yToken, yAmount)
					),
				});
			} else if (state.action === "create" && ammCost) {
				return updateState({
					tx: buildCreateAmmTx(
						address,
						formatTxInput(xToken, xAmount),
						formatTxInput(yToken, yAmount),
						state.tradingFee,
						ammCost
					),
				});
			} else if (state.action === "addSingle") {
				return updateState({
					tx: buildSingleAssetDepositTx(
						address,
						formatTxInput(xToken, xAmount),
						formatTxInput(yToken, yAmount)
					),
				});
			}
		},
		[tokenInputs, address, state, ammCost]
	);

	const setTradingFee = useCallback(
		(fee: string) => {
			updateState({ tradingFee: +fee });
			buildTransaction({});
		},
		[buildTransaction]
	);

	const getPoolBalances = useCallback(() => {
		if (!state.xToken || !state.yToken || !liquidityPool) return;

		const [x] = liquidityPool.poolKey.split("-");

		const xCurrencyFormat = state.xToken.ticker || normalizeCurrencyCode(state.xToken.currency);

		return {
			x: liquidityPool.liquidity[x === xCurrencyFormat ? 0 : 1],
			y: liquidityPool.liquidity[x === xCurrencyFormat ? 1 : 0],
		};
	}, [state.xToken, state.yToken, liquidityPool]);

	const setAmount = useCallback(
		({ src, amount }: { src: TokenSource; amount: string }) => {
			if (src === "x") {
				buildTransaction({ xAmount: amount });
				setXAmount(amount);
			} else {
				setYAmount(amount);
				buildTransaction({ yAmount: amount });
			}
			const otherSrc = src === "x" ? "y" : "x";

			const token = state[`${src}Token`];
			const otherToken = state[`${otherSrc}Token`];

			if (!token || !otherToken || state.action === "create") return;

			const poolBalances = getPoolBalances();
			if (!poolBalances) return;

			const tokenLiquidity = poolBalances[src];
			const otherLiquidity = poolBalances[otherSrc];

			const otherConverted = +amount * (+otherLiquidity / +tokenLiquidity);

			if (src === "x") setYAmount(otherConverted.toString());
			else setXAmount(otherConverted.toString());

			const xBalance = src === "x" ? amount : otherConverted.toString();
			const yBalance = src === "y" ? amount : otherConverted.toString();

			buildTransaction({
				xAmount: xBalance.toString(),
				yAmount: yBalance.toString(),
			});
		},
		[buildTransaction, getPoolBalances, setXAmount, setYAmount, state]
	);

	const signTransaction = useCallback(async () => {
		if (!state.tx || !xrplProvider || !state.xToken || !state.yToken) return;

		xrplProvider
			.signTransaction(state.tx, (response: InteractiveTransactionResponse) => {
				if (response.status === "pending") {
					if (response.qrPng) updateState({ qr: response.qrPng });
					setTag("sign");
				} else if (response.status === "success") {
					refetchBalances().then(() => setTag("submitted"));
					updateState({
						explorerUrl: `${getXrplExplorerUrl("Pool")}/transactions/${response.hash}`,
					});
				} else {
					setTag("failed");
				}
			})
			.catch((err) => {
				console.log("could not sign XRPL transaction", err);
			});
	}, [state, setTag, xrplProvider, refetchBalances]);

	return (
		<AddLiquidityXrplContext.Provider
			value={{
				resetState,
				onPoolClick,
				setAmount,
				setToken,
				setTag,
				signTransaction,
				isDisabled,
				setTradingFee,
				toggleSingleAssetDeposit,
				...state,
				...tokenInputs,
			}}
		>
			{children}
		</AddLiquidityXrplContext.Provider>
	);
}

export function useAddLiquidityXrpl() {
	return useContext(AddLiquidityXrplContext);
}
