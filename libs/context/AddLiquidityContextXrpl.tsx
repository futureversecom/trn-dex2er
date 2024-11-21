import { useQuery } from "@tanstack/react-query";
import {
	createContext,
	type PropsWithChildren,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";
import { dropsToXrp, Transaction, xrpToDrops } from "xrpl";

import type { ContextTag, TokenSource, XamanData, XrplCurrency } from "@/libs/types";

import { useWallets, useXrplCurrencies } from ".";
import { DEFAULT_GAS_TOKEN } from "../constants";
import { useXrplTokenInputs, XrplTokenInputs, XrplTokenInputState } from "../hooks";
import {
	buildCreateAmmTx,
	buildDepositAmmTx,
	checkAmmExists,
	getAmmcost,
	getCurrency,
	getXrplExplorerUrl,
	InteractiveTransactionResponse,
} from "../utils";

export type AddLiquidityXrplContextType = {
	resetState: () => void;
	onPoolClick: (xToken: XrplCurrency, yToken: XrplCurrency) => void;
	setAmount: (args: { src: TokenSource; amount: string }) => void;
	setToken: (args: { src: TokenSource; token: XrplCurrency }) => void;
	signTransaction: () => void;
	setTag: (tag?: ContextTag) => void;
	xamanData?: XamanData;
	setTradingFee: (fee: string) => void;
	tradingFee?: string;
} & AddLiquidityStateXrpl &
	Omit<XrplTokenInputs, "setXAmount" | "setYAmount">;

const AddLiquidityXrplContext = createContext<AddLiquidityXrplContextType>(
	{} as AddLiquidityXrplContextType
);

// TODO 711 prune these
interface AddLiquidityStateXrpl extends XrplTokenInputState {
	tx?: Transaction;
	tag?: ContextTag;
	explorerUrl?: string;
	error?: string;
	feeError?: string;
	estPoolShare?: number;
	ratioBase: TokenSource;
	action: "add" | "create";
	tradingFee?: string;
	qr?: string;
	ammExists?: boolean;
}

const initialState = {
	slippage: "5",
	gasToken: DEFAULT_GAS_TOKEN,
	ratioBase: "x",
	action: "add",
} as AddLiquidityStateXrpl;

export function AddLiquidityXrplProvider({ children }: PropsWithChildren) {
	const [state, setState] = useState<AddLiquidityStateXrpl>(initialState);
	const { address, xrplProvider } = useWallets();

	const updateState = (update: Partial<AddLiquidityStateXrpl>) =>
		setState((prev) => ({ ...prev, ...update }));

	const setTag = useCallback((tag?: ContextTag) => updateState({ tag }), []);

	const checkPool = useCallback(
		({
			xToken = tokenInputs[`xToken`],
			yToken = tokenInputs[`yToken`],
		}: {
			xToken?: XrplCurrency;
			yToken?: XrplCurrency;
		}) => {
			void (async () => {
				if (!xToken || !yToken || !xrplProvider) return;

				const valid = await checkAmmExists(xrplProvider, xToken, yToken);
				if (state.action === "add" && !valid) {
					return updateState({ action: "create", ammExists: valid });
				}
				if (state.action === "create" && valid) {
					return updateState({ action: "add", ammExists: valid });
				}
			})();
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[state.action, state.xToken, state.yToken, xrplProvider]
	);

	const setToken = useCallback(
		({ src, token }: { src: TokenSource; token: XrplCurrency }) => {
			if (src === "x") {
				checkPool({ xToken: token });
			} else {
				checkPool({ yToken: token });
			}

			updateState({
				[`${src}Token`]: token,
			});
		},
		[checkPool]
	);

	const { data: ammCost } = useQuery({
		queryKey: ["amm_cost"],
		queryFn: () => getAmmcost(xrplProvider),
		enabled: !!xrplProvider,
	});

	const setTradingFee = useCallback((fee: string) => {
		updateState({ tradingFee: fee });
	}, []);

	const {
		setXAmount,
		setYAmount,
		isDisabled: isTokenDisabled,
		...tokenInputs
	} = useXrplTokenInputs(state, setToken);

	const resetState = useCallback(() => {
		setState(initialState);
		setXAmount("");
		setYAmount("");
	}, [setXAmount, setYAmount]);

	const { pools, refetch: refetchBalances } = useXrplCurrencies();

	const liquidityPool = useMemo(() => {
		if (!state.xToken || !state.yToken) return;

		const xToken = state.xToken;
		const yToken = state.yToken;

		return pools.find(({ poolKey }) => {
			const [x, y] = poolKey.split("-");

			return (
				(x === xToken.currency && y === yToken.currency) ||
				(x === yToken.currency && y === xToken.currency)
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
						xToken.issuer
							? { ...xToken, issuer: xToken.issuer as string, value: xAmount }
							: xrpToDrops(xAmount),
						yToken.issuer
							? { ...yToken, issuer: yToken.issuer as string, value: yAmount }
							: xrpToDrops(yAmount)
					),
				});
			} else if (state.action === "create" && state.tradingFee && ammCost) {
				return updateState({
					tx: buildCreateAmmTx(
						address,
						xToken.issuer
							? { ...xToken, issuer: xToken.issuer as string, value: xAmount }
							: xrpToDrops(xAmount),
						yToken.issuer
							? { ...yToken, issuer: yToken.issuer as string, value: yAmount }
							: xrpToDrops(yAmount),
						+state.tradingFee,
						ammCost
					),
				});
			}
		},
		[tokenInputs, address, state, ammCost]
	);

	const getPoolBalances = useCallback(() => {
		if (!state.xToken || !state.yToken || !liquidityPool) return;

		const [x] = liquidityPool.poolKey.split("-");

		return {
			x: liquidityPool.liquidity[x === state.xToken.currency ? 0 : 1],
			y: liquidityPool.liquidity[x === state.xToken.currency ? 1 : 0],
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

			if (!token || !otherToken) return;

			const poolBalances = getPoolBalances();
			if (!poolBalances) return;

			const tokenLiquidity =
				token.currency === "XRP" ? dropsToXrp(poolBalances[src]) : poolBalances[src];
			const otherLiquidity =
				otherToken.currency === "XRP" ? dropsToXrp(poolBalances[otherSrc]) : poolBalances[otherSrc];

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
