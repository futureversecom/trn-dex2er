import BigNumber from "bignumber.js";
import {
	createContext,
	type PropsWithChildren,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";
import { Balance as CurrencyBalance, dropsToXrp, Transaction, xrpToDrops } from "xrpl";

import type { ContextTag, TokenSource, XrplCurrency } from "@/libs/types";

import { useWallets, useXrplCurrencies } from ".";
import { useXrplTokenInputs, XrplTokenInputs, type XrplTokenInputState } from "../hooks";
import {
	buildDepositAmmTx,
	buildWithdrawAmmTx,
	checkAmmExists,
	getCurrency,
	getXrplExplorerUrl,
	InteractiveTransactionResponse,
} from "../utils";

export interface XrplPosition {
	currency: string;
	xToken: XrplCurrency;
	yToken: XrplCurrency;
	lpBalance?: CurrencyBalance;
	poolShare?: BigNumber;
}

interface PoolBalance {
	balance: CurrencyBalance;
	liquidity: CurrencyBalance;
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

// TODO 711 prune these
interface ManageXrplPoolState extends XrplTokenInputState {
	action: "add" | "remove" | "create";
	slippage?: string;
	tx?: Transaction;
	tradingFee?: number;
	yAmountMin?: string;
	ratio?: string;
	tag?: ContextTag;
	explorerUrl?: string;
	error?: string;
	feeError?: string;
	priceDifference?: number;
	qr?: string;
	ammExists?: boolean;
	estimatedFee?: string;
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

				let error = "";
				const valid = await checkAmmExists(xrplProvider, xToken, yToken);
				if (state.action === "add" && !valid)
					error = "This pair is not valid yet. Choose another token to deposit";
				if (state.action === "create" && valid)
					error = "This pool already exists. Choose another token to deposit";

				updateState({ error, ammExists: valid });
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

	// use to check lp token balance
	const { positions, pools, refetch: refetchBalances } = useXrplCurrencies();

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

			// TODO 711 need to check if these pools are valid
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
			} else if (state.action === "remove") {
				return updateState({
					tx: buildWithdrawAmmTx(
						address,
						xToken.issuer
							? { ...xToken, issuer: xToken.issuer as string, value: xAmount }
							: xrpToDrops(xAmount),
						yToken.issuer
							? { ...yToken, issuer: yToken.issuer as string, value: yAmount }
							: xrpToDrops(yAmount)
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

	const setAmount = useCallback(
		({ src, amount }: { src: TokenSource; amount: string }) => {
			if (src === "x") {
				buildTransaction({ xAmount: amount });
				setXAmount(amount);
			} else {
				setYAmount(amount);
				buildTransaction({ yAmount: amount });
			}
			checkPool({});
		},
		[buildTransaction, checkPool, setXAmount, setYAmount]
	);

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

	useMemo(() => {
		if (!liquidityPool || !positions.length) return;

		const position = positions.find((pos) => pos.currency === liquidityPool.currency);

		updateState({ position });
	}, [positions, liquidityPool]);

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
				} as CurrencyBalance,
				liquidity: {
					currency: state.xToken.currency,
					value: xLiquidity.toString(),
				} as CurrencyBalance,
			},
			y: {
				balance: {
					currency: state.yToken.currency,
					value:
						state.yToken.currency === "XRP" ? dropsToXrp(yBalance.toFixed(0)) : yBalance.toString(),
				} as CurrencyBalance,
				liquidity: {
					currency: state.yToken.currency,
					value: yLiquidity.toString(),
				} as CurrencyBalance,
			},
		};

		return bal;
	}, [liquidityPool, state.position?.poolShare, state.xToken, state.yToken]);

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
