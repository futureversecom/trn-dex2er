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
import { AccountLinesTrustline, AMMInfoRequest } from "xrpl";

import { useFetchXrplPools } from "../hooks";
import type { LiquidityPoolsXrpl, XrplBalance, XrplCurrency } from "../types";
import { getXrplPools, normalizeCurrencyCode } from "../utils";
import { XrplPosition } from "./ManageXrplPoolContext";
import { useUsdPrices } from "./UsdPriceContext";
import { useWallets } from "./WalletContext";

export type XrplCurrencyContextType = {
	currencies: XrplCurrency[];
	balances: XrplBalance[];
	trustlines: AccountLinesTrustline[];
	checkTrustline: (currency: XrplCurrency) => boolean;
	getBalance: (currency?: XrplCurrency) => XrplBalance | undefined;
	isFetching: boolean;
	refetch: () => Promise<void>;
	positions: XrplPosition[];
	pools: LiquidityPoolsXrpl;
	findToken: (currencyCode: string) => XrplCurrency | undefined;
	updateCurr: (update: XrplCurrency) => void;
	updateCurrError: string | undefined;
	openImportModal: (open: boolean) => void;
	importModalOpen: boolean;
	setImportSuccess: (success: boolean) => void;
	importSuccess: boolean;
};

const XrplCurrencyContext = createContext<XrplCurrencyContextType>({} as XrplCurrencyContextType);

interface XrplCurrencyProviderProps extends PropsWithChildren {
	currencies: XrplCurrency[];
}

const initialTokenPairs: Array<AMMInfoRequest> = getXrplPools();

export function XrplCurrencyProvider({ currencies, children }: XrplCurrencyProviderProps) {
	const { prices } = useUsdPrices();
	const { address, xrplProvider } = useWallets();
	const [tokenPairs, setTokenPairs] = useState<Array<AMMInfoRequest>>(initialTokenPairs);
	const { data: pools, isFetching: isFetchingPools } = useFetchXrplPools(
		xrplProvider,
		tokenPairs,
		prices
	);

	const [curr, setCurr] = useState<XrplCurrency[]>(currencies);
	const [updateCurrError, setCurrError] = useState<string>();
	const [importModalOpen, setImportModalOpen] = useState<boolean>(false);
	const [importSuccess, setImportSuccess] = useState<boolean>(false);

	const openImportModal = useCallback((open: boolean, error?: string) => {
		setImportModalOpen(open);
		setCurrError(error);
	}, []);

	const currenciesWithPrices = useMemo(() => {
		if (!prices) return curr;

		return curr.map((currency) => ({
			...currency,
			priceInUSD: prices[currency.currency],
		}));
	}, [curr, prices]);

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
		if (!balances) return;

		const userLPTokens = balances
			.filter((b) => b.currency.startsWith("03")) // Filter for lp token balances
			.map((e) => {
				return {
					command: "amm_info",
					amm_account: e.issuer,
				} as AMMInfoRequest;
			});

		const tokens = initialTokenPairs.concat(userLPTokens);

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

	const getBalance = useCallback(
		(currency?: XrplCurrency) => {
			return balances?.find((balance) => {
				return balance.currency === currency?.currency && balance.issuer === currency?.issuer;
			});
		},
		[balances]
	);

	const findToken = useCallback(
		(currencyCode: string): XrplCurrency | undefined => {
			return Object.values(currenciesWithPrices).find((currency) => {
				return (
					currency.currency === currencyCode ||
					normalizeCurrencyCode(currency.currency) === currencyCode
				);
			});
		},
		[currenciesWithPrices]
	);

	const checkTrustline = useCallback(
		(currency: XrplCurrency) => {
			if (currency.currency === "XRP") return true;

			return !!trustlines?.find((trustline) => trustline.currency === currency.currency);
		},
		[trustlines]
	);

	const updateCurr = useCallback(
		(update: XrplCurrency) => {
			if (currenciesWithPrices.includes(update)) {
				setCurrError("Token already imported");
				return;
			}
			if (update.currency.startsWith("03")) {
				setCurrError("Cannot import LP tokens");
				return;
			}

			if (checkTrustline(update)) {
				setCurr((prev) => [...prev, update]);
				setCurrError(undefined);
				setImportSuccess(true);
			} else {
				setCurrError("Trust line not set");
			}
		},
		[checkTrustline, currenciesWithPrices]
	);

	useMemo(() => {
		if (!trustlines) return;
		trustlines.map((line) => {
			// don't want to import lp tokens
			if (line.currency.startsWith("03")) {
				return;
			}
			const update = {
				ticker: normalizeCurrencyCode(line.currency),
				currency: line.currency,
				issuer: line.account,
			};

			setCurr((prev) => [...prev, update]);
		});
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

	const refetch = useCallback(async () => {
		await Promise.all([refetchBalances(), refetchTrustlines()]);
	}, [refetchBalances, refetchTrustlines]);

	return (
		<XrplCurrencyContext.Provider
			value={{
				currencies: currenciesWithPrices ?? curr,
				balances: balances ?? [],
				trustlines: trustlines ?? [],
				checkTrustline,
				getBalance,
				isFetching: isFetchingBalances || isFetchingTrustlines || isFetchingPools,
				refetch,
				positions: positions ?? [],
				pools: pools ?? [],
				findToken,
				updateCurr,
				updateCurrError,
				openImportModal,
				importModalOpen,
				setImportSuccess,
				importSuccess,
			}}
		>
			{children}
		</XrplCurrencyContext.Provider>
	);
}

export function useXrplCurrencies() {
	return useContext(XrplCurrencyContext);
}
