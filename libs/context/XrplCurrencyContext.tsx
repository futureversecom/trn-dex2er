import { useQuery } from "@tanstack/react-query";
import { createContext, type PropsWithChildren, useCallback, useContext, useMemo } from "react";
import { AccountLinesTrustline } from "xrpl";

import type { XrplBalance, XrplCurrency } from "../types";
import { useUsdPrices } from "./UsdPriceContext";
import { useWallets } from "./WalletContext";

export type XrplCurrencyContextType = {
	currencies: XrplCurrency[];
	balances: XrplBalance[];
	trustlines: AccountLinesTrustline[];
	hasTrustline: (currency: XrplCurrency) => boolean;
	getBalance: (currency?: XrplCurrency) => XrplBalance | undefined;
	isFetching: boolean;
	refetch: () => Promise<void>;
};

const XrplCurrencyContext = createContext<XrplCurrencyContextType>({} as XrplCurrencyContextType);

interface XrplCurrencyProviderProps extends PropsWithChildren {
	currencies: XrplCurrency[];
}

export function XrplCurrencyProvider({ currencies, children }: XrplCurrencyProviderProps) {
	const { prices } = useUsdPrices();
	const { address, xrplProvider } = useWallets();

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
			return balances?.find(
				(balance) => balance.currency === currency?.currency && balance.issuer === currency?.issuer
			);
		},
		[balances]
	);

	const hasTrustline = useCallback(
		(currency: XrplCurrency) => {
			if (currency.currency === "XRP") return true;

			return !!trustlines?.find((trustline) => trustline.currency === currency.currency);
		},
		[trustlines]
	);

	const refetch = useCallback(async () => {
		await Promise.all([refetchBalances(), refetchTrustlines()]);
	}, [refetchBalances, refetchTrustlines]);

	return (
		<XrplCurrencyContext.Provider
			value={{
				currencies: currenciesWithPrices ?? currencies,
				balances: balances ?? [],
				trustlines: trustlines ?? [],
				hasTrustline,
				getBalance,
				isFetching: isFetchingBalances || isFetchingTrustlines,
				refetch,
			}}
		>
			{children}
		</XrplCurrencyContext.Provider>
	);
}

export function useXrplCurrencies() {
	return useContext(XrplCurrencyContext);
}
