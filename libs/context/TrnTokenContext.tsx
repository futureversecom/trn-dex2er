import type { VoidFn } from "@polkadot/api/types";
import { createContext, type PropsWithChildren, useCallback, useContext, useMemo } from "react";

import { Balance } from "@/libs/utils";

import { useFetchTrnPools, useTrnBalanceSubscription } from "../hooks";
import type { LiquidityPools, TrnToken, TrnTokens } from "../types";
import { useUsdPrices } from "./UsdPriceContext";

export type TrnTokenContextType = {
	tokens: TrnTokens;
	pools: LiquidityPools;
	refetchPools: () => void;
	isFetching: boolean;
	tokenBalances: Record<number, Balance<TrnToken>>;
	refetchTokenBalances: () => Promise<VoidFn | undefined>;
	getTokenBalance: (token?: TrnToken) => Balance<TrnToken> | undefined;
};

const TrnTokenContext = createContext<TrnTokenContextType>({} as TrnTokenContextType);

interface TrnTokenProviderProps extends PropsWithChildren {
	tokens: TrnTokens;
}

export function TrnTokenProvider({ tokens, children }: TrnTokenProviderProps) {
	const { prices } = useUsdPrices();

	const tokensWithPrices = useMemo(() => {
		if (!prices) return tokens;

		return Object.entries(tokens).reduce<TrnTokens>(
			(acc, [assetId, token]) => ({
				...acc,
				[assetId]: {
					...token,
					priceInUSD: prices[token.symbol],
				},
			}),
			{}
		);
	}, [tokens, prices]);

	const [tokenBalances, refetchTokenBalances] = useTrnBalanceSubscription(tokens);

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
		refetch: refetchPools,
		isFetching: isFetchingPools,
	} = useFetchTrnPools(tokens);

	return (
		<TrnTokenContext.Provider
			value={{
				refetchPools,
				tokenBalances,
				getTokenBalance,
				refetchTokenBalances,
				pools: pools ?? [],
				tokens: tokensWithPrices ?? tokens,
				isFetching: isFetchingPools,
			}}
		>
			{children}
		</TrnTokenContext.Provider>
	);
}

export function useTrnTokens() {
	return useContext(TrnTokenContext);
}
