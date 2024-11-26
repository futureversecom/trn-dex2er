import BigNumber from "bignumber.js";
import {
	createContext,
	type PropsWithChildren,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";
import { Balance, Currency, dropsToXrp, Transaction } from "xrpl";

import type { ContextTag, TokenSource, XrplCurrency } from "@/libs/types";

import { useWallets, useXrplCurrencies } from ".";
import { useXrplTokenInputs, XrplTokenInputs, type XrplTokenInputState } from "../hooks";
import {
	buildDepositAmmTx,
	buildWithdrawAmmTx,
	checkAmmExists,
	formatTxInput,
	getCurrency,
	getXrplExplorerUrl,
	InteractiveTransactionResponse,
	normalizeCurrencyCode,
	xrplCurrencytoCurrency,
} from "../utils";

export interface XrplPosition {
	currency: string;
	xToken: XrplCurrency;
	yToken: XrplCurrency;
	lpBalance?: Balance;
	poolShare?: BigNumber;
}

interface PoolBalance {
	balance: Balance;
	liquidity: Balance;
}

interface PoolBalances {
	x: PoolBalance;
	y: PoolBalance;
}

export type XrplManagePoolContextType = {
	resetState: () => void;
	onPoolClick: (xToken: XrplCurrency, yToken: XrplCurrency) => void;
	onSwitchClick: () => void;
	setAmount: (args: { src: TokenSource; amount: string }) => void;
	signTransaction: () => Promise<void>;
	setTag: (tag?: ContextTag) => void;
	positions: Array<XrplPosition>;
	poolBalances?: PoolBalances;
} & ManageXrplPoolState &
	Omit<XrplTokenInputs, "setXAmount" | "setYAmount">;

interface ManageXrplPoolState extends XrplTokenInputState {
	action: "add" | "remove";
	tx?: Transaction;
	tag?: ContextTag;
	explorerUrl?: string;
	error?: string;
	qr?: string;
	ammExists?: boolean;
	position?: XrplPosition;
}

const ManageXrplPoolContext = createContext<XrplManagePoolContextType>(
	{} as XrplManagePoolContextType
);

const initialState: ManageXrplPoolState = {
	action: "add",
};

export function ManageXrplPoolProvider({ children }: PropsWithChildren) {
	const [state, setState] = useState<ManageXrplPoolState>(initialState);

	const updateState = (update: Partial<ManageXrplPoolState>) =>
		setState((prev) => ({ ...prev, ...update }));

	const setTag = useCallback((tag?: ContextTag) => updateState({ tag }), []);

	const { address, xrplProvider } = useWallets();

	const setToken = useCallback(({ src, token }: { src: TokenSource; token: XrplCurrency }) => {
		updateState({
			[`${src}Token`]: token,
		});
	}, []);

	// use to check lp token balance
	const { positions, pools, refetch: refetchBalances } = useXrplCurrencies();

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

	const poolBalances = useMemo(() => {
		if (!state.xToken || !state.yToken || !liquidityPool || !state.position?.poolShare) return;

		const [x] = liquidityPool.poolKey.split("-");

		const poolShare = state.position.poolShare.dividedBy(100);

		const xLiquidity = liquidityPool.liquidity[x === state.xToken.currency ? 0 : 1];
		const yLiquidity = liquidityPool.liquidity[x === state.xToken.currency ? 1 : 0];

		const xBalance = poolShare.multipliedBy(+xLiquidity);
		const yBalance = poolShare.multipliedBy(+yLiquidity);

		const bal = {
			x: {
				balance: {
					currency: state.xToken.currency,
					value:
						state.xToken.currency === "XRP" ? dropsToXrp(xBalance.toFixed(0)) : xBalance.toString(),
				} as Balance,
				liquidity: {
					currency: state.xToken.currency,
					value: xLiquidity.toString(),
				} as Balance,
			},
			y: {
				balance: {
					currency: state.yToken.currency,
					value:
						state.yToken.currency === "XRP" ? dropsToXrp(yBalance.toFixed(0)) : yBalance.toString(),
				} as Balance,
				liquidity: {
					currency: state.yToken.currency,
					value: yLiquidity.toString(),
				} as Balance,
			},
		};

		return bal;
	}, [liquidityPool, state.position?.poolShare, state.xToken, state.yToken]);

	const {
		setXAmount,
		setYAmount,
		isDisabled: isTokenDisabled,
		...tokenInputs
	} = useXrplTokenInputs(
		state,
		setToken,
		state.action === "remove"
			? poolBalances && {
					x: poolBalances?.x.balance,
					y: poolBalances?.y.balance,
				}
			: undefined
	);

	useMemo(() => {
		void (async () => {
			const xToken = tokenInputs[`xToken`];
			const yToken = tokenInputs[`yToken`];

			if (!xToken || !yToken || !xrplProvider) return;

			const assetOne: Currency = xrplCurrencytoCurrency(xToken);
			const assetTwo: Currency = xrplCurrencytoCurrency(yToken);

			const valid = await checkAmmExists(xrplProvider, assetOne, assetTwo);

			if (!valid) {
				return updateState({
					error: "This pair is not valid yet. Choose another token to deposit",
				});
			} else {
				return updateState({
					error: undefined,
				});
			}
		})();
	}, [tokenInputs, xrplProvider]);

	const resetState = useCallback(() => {
		setState(initialState);
		setXAmount("");
		setYAmount("");
	}, [setXAmount, setYAmount]);

	const onPoolClick = useCallback((xToken: XrplCurrency, yToken: XrplCurrency) => {
		updateState({ xToken, yToken });
	}, []);

	const onSwitchClick = useCallback(() => {
		updateState({ action: state.action === "add" ? "remove" : "add" });
	}, [state.action]);

	const buildTransaction = useCallback(
		async ({
			xAmount = tokenInputs[`xAmount`],
			yAmount = tokenInputs[`yAmount`],
		}: {
			xAmount?: string;
			yAmount?: string;
		}) => {
			if (!address || !xrplProvider || !state.xToken || !state.yToken || !xAmount || !yAmount)
				return;

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
			} else if (state.action === "remove") {
				return updateState({
					tx: buildWithdrawAmmTx(
						address,
						formatTxInput(xToken, xAmount),
						formatTxInput(yToken, yAmount)
					),
				});
			}
		},
		[address, state, tokenInputs, xrplProvider]
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

	const isDisabled = useMemo(() => {
		if (state.tag === "sign") return true;

		return isTokenDisabled || !!state.error;
	}, [state, isTokenDisabled]);

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

	useMemo(() => {
		if (!liquidityPool || !positions.length) return;

		const position = positions.find((pos) => pos.currency === liquidityPool.currency);

		updateState({ position });
	}, [positions, liquidityPool]);

	return (
		<ManageXrplPoolContext.Provider
			value={{
				onPoolClick,
				setAmount,
				setTag,
				positions,
				isDisabled,
				signTransaction,
				onSwitchClick,
				poolBalances,
				resetState,
				...state,
				...tokenInputs,
			}}
		>
			{children}
		</ManageXrplPoolContext.Provider>
	);
}

export function useManageXrplPool() {
	return useContext(ManageXrplPoolContext);
}
