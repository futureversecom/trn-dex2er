import { useQuery } from "@tanstack/react-query";
import BigNumber from "bignumber.js";
import {
	createContext,
	type PropsWithChildren,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";
import { AccountLinesTrustline, AMMInfoRequest, IssuedCurrency, TrustSet } from "xrpl";

import { useFetchXrplPools } from "../hooks";
import type { ContextTag, LiquidityPoolsXrpl, XrplBalance, XrplCurrency } from "../types";
import {
	buildCreateTrustLineTx,
	getXrplPools,
	InteractiveTransactionResponse,
	normalizeCurrencyCode,
} from "../utils";
import { XrplPosition } from "./ManageXrplPoolContext";
import { useUsdPrices } from "./UsdPriceContext";
import { useWallets } from "./WalletContext";

export type XrplCurrencyContextType = {
	// Data
	currencies: XrplCurrency[];
	balances: XrplBalance[];
	trustlines: AccountLinesTrustline[];
	pools: LiquidityPoolsXrpl;
	positions: XrplPosition[];

	// State flags
	isFetching: boolean;
	isLoadingPools: boolean;
	error: string | undefined;
	filter: string;

	// Data access methods
	checkTrustline: (currency: XrplCurrency) => boolean;
	getBalance: (currency?: XrplCurrency) => XrplBalance | undefined;
	findToken: (currencyCode: string) => XrplCurrency | undefined;

	// Actions
	refetch: () => Promise<void>;
	openImportModal: (open: boolean) => void;
	buildTrustLineTx: (token: IssuedCurrency) => void;
	signTransaction: () => Promise<void>;
	resetState: () => void;

	// State setters
	setTag: (tag?: ContextTag) => void;
	setCurrencyCode: (code?: string) => void;
	setIssuer: (issuer?: string) => void;
	setFilter: (filter: string) => void;
} & XrplCurrencyContextState;

const XrplCurrencyContext = createContext<XrplCurrencyContextType>({} as XrplCurrencyContextType);

interface XrplCurrencyProviderProps extends PropsWithChildren {
	predefinedCurrencies: XrplCurrency[];
}

interface XrplCurrencyContextState {
	tx?: TrustSet;
	tag?: ContextTag;
	error?: string;
	info?: string;
	qr?: string;
	importModalOpen: boolean;
	currencyCode?: string;
	issuer?: string;
}

const initialState = {
	importModalOpen: false,
} as XrplCurrencyContextState;

const INITIAL_TOKEN_PAIRS: Array<AMMInfoRequest> = getXrplPools();

export function XrplCurrencyProvider({
	predefinedCurrencies,
	children,
}: XrplCurrencyProviderProps) {
	const { prices } = useUsdPrices();
	const { address, xrplProvider } = useWallets();
	const [tokenPairs, setTokenPairs] = useState<Array<AMMInfoRequest>>(INITIAL_TOKEN_PAIRS);
	const {
		data: pools,
		isFetching: isFetchingPools,
		refetch: refetchXrplPools,
		isLoading: isLoadingPools,
	} = useFetchXrplPools(xrplProvider, tokenPairs, prices);

	const [filter, setFilter] = useState("");

	const filterPool = useCallback((f: string) => setFilter(f), []);

	const [state, setState] = useState<XrplCurrencyContextState>({
		...initialState,
	});

	const resetState = useCallback(() => {
		setState(initialState);
	}, []);

	const updateState = (update: Partial<XrplCurrencyContextState>) =>
		setState((prev) => ({ ...prev, ...update }));

	const [currencies, setCurrencies] = useState<XrplCurrency[]>(predefinedCurrencies);

	const openImportModal = useCallback((open: boolean, error?: string) => {
		updateState({ importModalOpen: open, error: error });
	}, []);

	const currenciesWithPrices = useMemo(() => {
		if (!prices) return currencies;

		return currencies.map((currency) => ({
			...currency,
			priceInUSD: prices[normalizeCurrencyCode(currency.currency)],
		}));
	}, [currencies, prices]);

	const {
		data: balances,
		isFetching: isFetchingBalances,
		refetch: refetchBalances,
	} = useQuery({
		queryKey: ["xrplBalances", address],
		queryFn: () => xrplProvider?.getBalances(),
		refetchInterval: 60000,
		enabled: !!xrplProvider,
	});

	useMemo(() => {
		if (balances) refetchXrplPools();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [balances]);

	useMemo(() => {
		if (!balances) return;

		const userLPTokens = balances
			.filter((b) => b.currency.startsWith("03")) // Filter for lp token balances
			.map((e) => {
				return {
					command: "amm_info",
					amm_account: e.issuer,
				} as AMMInfoRequest;
			});

		const dupsRemoved = INITIAL_TOKEN_PAIRS.filter((t) => {
			return !userLPTokens.some((v) => t.amm_account === v.amm_account);
		});

		const tokens = dupsRemoved.concat(userLPTokens);

		setTokenPairs(tokens);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [balances]);

	const {
		data: trustlines,
		isFetching: isFetchingTrustlines,
		refetch: refetchTrustlines,
	} = useQuery({
		queryKey: ["xrplTrustlines", address],
		queryFn: () => xrplProvider?.getTrustlines(),
		refetchInterval: 60000,
		enabled: !!xrplProvider,
	});

	const buildTrustLineTx = useCallback(
		({
			currencyCode = state[`currencyCode`],
			issuer = state[`issuer`],
		}: {
			currencyCode?: string;
			issuer?: string;
		}) => {
			if (!address) return;
			const body = { currency: currencyCode, issuer: issuer } as IssuedCurrency;
			updateState({ tx: buildCreateTrustLineTx(address, body) });
		},
		[address, state]
	);

	const setTag = useCallback((tag?: ContextTag) => updateState({ tag }), []);
	const setCurrencyCode = useCallback(
		(code?: string) => {
			buildTrustLineTx({ currencyCode: code });
			updateState({ currencyCode: code });
		},
		[buildTrustLineTx]
	);
	const setIssuer = useCallback(
		(issuer?: string) => {
			buildTrustLineTx({ issuer });
			updateState({ issuer });
		},
		[buildTrustLineTx]
	);

	const signTransaction = useCallback(async () => {
		if (!state.tx || !xrplProvider) return;

		xrplProvider
			.signTransaction(state.tx, (response: InteractiveTransactionResponse) => {
				if (response.status === "pending") {
					if (response.qrPng) updateState({ qr: response.qrPng });
					setTag("sign");
				} else if (response.status === "success") {
					refetchBalances().then(() => setTag("submitted"));
					refetchTrustlines();
					updateState({ info: undefined, error: undefined });
				} else {
					setTag("failed");
				}
			})
			.catch((err) => {
				console.log("could not sign XRPL transaction", err);
			});
	}, [state.tx, xrplProvider, setTag, refetchBalances, refetchTrustlines]);

	const getBalance = useCallback(
		(currency?: XrplCurrency) => {
			return balances?.find((balance) => {
				return (
					(balance.currency === currency?.currency ||
						balance.currency === currency?.ticker ||
						normalizeCurrencyCode(balance.currency) === currency?.currency) &&
					balance.issuer === currency?.issuer
				);
			});
		},
		[balances]
	);

	const findToken = useCallback(
		(currencyCode: string): XrplCurrency | undefined => {
			const trustedTokens = Object.values(currenciesWithPrices).find((currency) => {
				return (
					currency.currency === currencyCode ||
					normalizeCurrencyCode(currency.currency) === currencyCode
				);
			});
			if (!trustedTokens) {
				return Object.values(predefinedCurrencies).find((currency) => {
					return (
						currency.currency === currencyCode ||
						normalizeCurrencyCode(currency.currency) === currencyCode
					);
				});
			}
			return trustedTokens;
		},
		[currenciesWithPrices, predefinedCurrencies]
	);

	const checkTrustline = useCallback(
		(currency: XrplCurrency) => {
			if (currency.currency === "XRP") return true;

			return !!trustlines?.find(
				(trustline) =>
					trustline.currency === currency.currency || trustline.currency === currency.ticker
			);
		},
		[trustlines]
	);

	useMemo(() => {
		if (!state.currencyCode || !state.issuer) return;

		const update = {
			currency: state.currencyCode,
			issuer: state.issuer,
			ticker: normalizeCurrencyCode(state.currencyCode),
		} as XrplCurrency;

		if (update.currency.startsWith("03")) {
			updateState({ error: "Cannot import LP tokens", info: undefined, tx: undefined });
			return;
		}
		if (checkTrustline(update)) {
			updateState({ info: "Token already imported", error: undefined, tx: undefined });
		} else {
			updateState({ info: "Trust line not set", error: undefined });
		}
	}, [checkTrustline, state.currencyCode, state.issuer]);

	useMemo(() => {
		if (!trustlines) return;
		const update = trustlines
			.filter((line) => !line.currency.startsWith("03")) // Exclude LP tokens
			.map(
				(line) =>
					({
						ticker: normalizeCurrencyCode(line.currency),
						currency: line.currency,
						issuer: line.account,
					}) as XrplCurrency
			);

		update.push({ currency: "XRP", decimals: 6 } as XrplCurrency);

		setCurrencies(update);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [trustlines]);

	const positions = useMemo(() => {
		if (!pools) return null;

		return pools
			.map((pool) => {
				const [xCurrency, yCurrency] = pool.poolKey.split("-");

				const xToken = findToken(xCurrency);
				const yToken = findToken(yCurrency);

				if (!xToken || !yToken || !pool.lpTokenIssuer) return null;

				const userLPTokenBalance = balances?.find((line) => {
					return line.issuer === pool.lpTokenIssuer;
				});

				if (!userLPTokenBalance) return null;

				let poolShare: number = 0;
				if (userLPTokenBalance && pool.lpTokenSupply) {
					poolShare = (parseFloat(userLPTokenBalance.value) / parseFloat(pool.lpTokenSupply)) * 100;
				}

				return {
					currency: pool.currency,
					xToken,
					yToken,
					lpBalance: userLPTokenBalance,
					poolShare: new BigNumber(poolShare),
				} as XrplPosition;
			})
			.filter((pool) => !!pool);
	}, [balances, findToken, pools]);

	const filteredPools = useMemo(() => {
		if (!pools) return;
		if (!filter) return pools;

		return pools.filter((pool) => {
			const [xCurrency, yCurrency] = pool.poolKey.split("-");

			const xToken = findToken(xCurrency);
			const yToken = findToken(yCurrency);

			if (!xToken || !yToken) return false;

			if (!xToken.ticker) {
				const ticker = normalizeCurrencyCode(xToken.currency);
				if (ticker.toLowerCase().includes(filter.toLowerCase())) return true;
			} else {
				if (xToken.ticker.toLowerCase().includes(filter.toLowerCase())) return true;
			}

			if (!yToken.ticker) {
				const ticker = normalizeCurrencyCode(yToken.currency);
				if (ticker.toLowerCase().includes(filter.toLowerCase())) return true;
			} else {
				if (yToken.ticker.toLowerCase().includes(filter.toLowerCase())) return true;
			}
		});
	}, [filter, findToken, pools]);

	const refetch = useCallback(async () => {
		await Promise.all([refetchBalances(), refetchTrustlines()]);
	}, [refetchBalances, refetchTrustlines]);

	return (
		<XrplCurrencyContext.Provider
			value={{
				// Data properties
				currencies: currenciesWithPrices ?? currencies,
				balances: balances ?? [],
				trustlines: trustlines ?? [],
				pools: filteredPools ?? [],
				positions: positions ?? [],
				filter,

				// Status flags
				isFetching: isFetchingBalances || isFetchingTrustlines || isFetchingPools,
				isLoadingPools,
				error: state.error,

				// Data access methods
				checkTrustline,
				getBalance,
				findToken,

				// Actions
				refetch,
				openImportModal,
				buildTrustLineTx,
				signTransaction,
				resetState,

				// State setters
				setTag,
				setCurrencyCode,
				setIssuer,
				setFilter: filterPool,

				// State object
				...state,
			}}
		>
			{children}
		</XrplCurrencyContext.Provider>
	);
}

export function useXrplCurrencies() {
	return useContext(XrplCurrencyContext);
}
