import type { VoidFn } from "@polkadot/api/types";
import type { BigNumber } from "bignumber.js";
import {
	createContext,
	type PropsWithChildren,
	useCallback,
	useContext,
	useMemo,
	useState,
} from "react";

import { Balance } from "@/libs/utils";

import { useFetchTrnPools, useTrnBalanceSubscription } from "../hooks";
import { useFetchTrnTokens } from "../hooks/useFetchTokens";
import type { LiquidityPoolsRoot, TrnToken, TrnTokens } from "../types";
import { useUsdPrices } from "./UsdPriceContext";

export interface Position {
	assetId: number;
	xToken: TrnToken;
	yToken: TrnToken;
	lpBalance: Balance<TrnToken>;
	poolShare: BigNumber;
}

export type TrnTokenContextType = {
	// Data
	tokens: TrnTokens;
	pools: LiquidityPoolsRoot;
	tokenBalances: Record<number, Balance<TrnToken>>;
	filter: string;

	// State flags
	isFetchingPools: boolean;
	isLoadingPools: boolean;

	// Data access methods
	getTokenBalance: (token?: TrnToken) => Balance<TrnToken> | undefined;

	// Actions
	refetchTokenBalances: () => Promise<VoidFn | undefined>;

	// State setters
	setFilter: (filter: string) => void;
};

const TrnTokenContext = createContext<TrnTokenContextType>({} as TrnTokenContextType);

interface TrnTokenProviderProps extends PropsWithChildren {
	trnTokens?: TrnTokens;
}

export function TrnTokenProvider({ children, trnTokens }: TrnTokenProviderProps) {
	const [filter, setFilter] = useState("");

	const filterPool = useCallback((f: string) => setFilter(f), []);

	const { prices } = useUsdPrices();
	const { data: tokensWithoutPrices } = useFetchTrnTokens(trnTokens);

	const [tokenBalances, refetchTokenBalances] = useTrnBalanceSubscription(tokensWithoutPrices);

	const tokensWithPrices = useMemo(() => {
		if (!tokensWithoutPrices) return undefined;
		if (!prices) return undefined;

		const { tokensWithPricesArray, tokensWithoutPricesArray } = Array.from(
			tokensWithoutPrices.entries()
		).reduce(
			(acc, [assetId, token]) => {
				const tokenBalance = tokenBalances?.[+assetId];
				const hasPositiveBalance = tokenBalance && tokenBalance.toNumber() > 0;
				const priceInUSD = prices[token.symbol];
				const hasValidPrice = priceInUSD !== undefined && !isNaN(priceInUSD);

				const tokenWithPrice = {
					assetId: assetId.toString(),
					token: { ...token, priceInUSD },
				};

				if (hasValidPrice && hasPositiveBalance) {
					acc.tokensWithPricesArray.push(tokenWithPrice);
				} else {
					acc.tokensWithoutPricesArray.push(tokenWithPrice);
				}

				return acc;
			},
			{
				tokensWithPricesArray: [] as Array<{
					assetId: string;
					token: TrnToken & { priceInUSD: number };
				}>,
				tokensWithoutPricesArray: [] as Array<{
					assetId: string;
					token: TrnToken & { priceInUSD: number };
				}>,
			}
		);

		tokensWithoutPricesArray.sort((a, b) => {
			const balanceA = tokenBalances?.[+a.assetId] || new Balance(0, a.token);
			const balanceB = tokenBalances?.[+b.assetId] || new Balance(0, b.token);
			return balanceB.comparedTo(balanceA);
		});

		// Sort by total value (balance * price) from highest to lowest
		tokensWithPricesArray.sort((a, b) => {
			const balanceA = tokenBalances?.[+a.assetId] || new Balance(0, a.token);
			const balanceB = tokenBalances?.[+b.assetId] || new Balance(0, b.token);

			const valueA = balanceA.multipliedBy(a.token.priceInUSD || 0);
			const valueB = balanceB.multipliedBy(b.token.priceInUSD || 0);

			return valueB.comparedTo(valueA);
		});

		const tokensArray = tokensWithPricesArray.concat(tokensWithoutPricesArray);

		const tokensMap: TrnTokens = new Map();

		tokensArray.forEach(({ assetId, token }) => {
			tokensMap.set(+assetId, token);
		});

		return tokensMap;
	}, [tokensWithoutPrices, prices, tokenBalances]);

	const getTokenBalance = useCallback(
		(token?: TrnToken) => {
			if (!token) return;
			if (!tokenBalances) return new Balance(0, token);

			return (
				Object.entries(tokenBalances).find(([assetId]) => +assetId === token.assetId)?.[1] ??
				new Balance(0, token)
			);
		},
		[tokenBalances]
	);

	const {
		data: pools,
		isFetching: isFetchingPools,
		isLoading: isLoadingPools,
	} = useFetchTrnPools(tokensWithPrices);

	const filteredPools = useMemo(() => {
		if (!pools || !tokensWithoutPrices) return;
		if (!filter) return pools;

		const findToken = (assetId: number, tokens: TrnTokens): TrnToken | undefined => {
			return tokens.get(assetId);
		};

		return pools.filter((pool) => {
			const poolKey = pool.poolKey.split("-");

			const xToken = findToken(+poolKey[0], tokensWithoutPrices);
			const yToken = findToken(+poolKey[1], tokensWithoutPrices);

			if (!xToken || !yToken) return false;

			if (xToken?.symbol.toLowerCase().includes(filter.toLowerCase())) {
				return true;
			}
			if (yToken?.symbol.toLowerCase().includes(filter.toLowerCase())) {
				return true;
			}

			return false;
		});
	}, [filter, pools, tokensWithoutPrices]);

	return (
		<TrnTokenContext.Provider
			value={{
				tokenBalances,
				getTokenBalance,
				refetchTokenBalances,
				pools: filteredPools ?? [],
				tokens: tokensWithPrices ?? tokensWithoutPrices ?? new Map(),
				isFetchingPools: isFetchingPools,
				isLoadingPools: isLoadingPools,
				setFilter: filterPool,
				filter,
			}}
		>
			{children}
		</TrnTokenContext.Provider>
	);
}

export function useTrnTokens() {
	return useContext(TrnTokenContext);
}
