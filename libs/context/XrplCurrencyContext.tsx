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

	const currenciesWithPrices = useMemo(() => {
		if (!prices) return currencies;

		return currencies.map((currency) => ({
			...currency,
			priceInUSD: prices[currency.currency],
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

	const { data: pools, isFetching: isFetchingPools } = useFetchXrplPools(xrplProvider, tokenPairs);

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
			return Object.values(currencies).find((currency) => {
				return (
					currency.currency === currencyCode ||
					normalizeCurrencyCode(currency.currency) === currencyCode
				);
			});
		},
		[currencies]
	);

	const checkTrustline = useCallback(
		(currency: XrplCurrency) => {
			if (currency.currency === "XRP") return true;

			return !!trustlines?.find((trustline) => trustline.currency === currency.currency);
		},
		[trustlines]
	);

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
				currencies: currenciesWithPrices ?? currencies,
				balances: balances ?? [],
				trustlines: trustlines ?? [],
				checkTrustline,
				getBalance,
				isFetching: isFetchingBalances || isFetchingTrustlines || isFetchingPools,
				refetch,
				positions: positions ?? [],
				pools: pools ?? [],
				findToken,
			}}
		>
			{children}
		</XrplCurrencyContext.Provider>
	);
}

export function useXrplCurrencies() {
	return useContext(XrplCurrencyContext);
}
