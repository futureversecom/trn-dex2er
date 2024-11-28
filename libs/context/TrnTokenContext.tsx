import type { VoidFn } from "@polkadot/api/types";
import type { BigNumber } from "bignumber.js";
import { createContext, type PropsWithChildren, useCallback, useContext, useMemo } from "react";

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
	tokens: TrnTokens;
	pools: LiquidityPoolsRoot;
	isFetching: boolean;
	tokenBalances: Record<number, Balance<TrnToken>>;
	refetchTokenBalances: () => Promise<VoidFn | undefined>;
	getTokenBalance: (token?: TrnToken) => Balance<TrnToken> | undefined;
	position: Position[];
};

const TrnTokenContext = createContext<TrnTokenContextType>({} as TrnTokenContextType);

interface TrnTokenProviderProps extends PropsWithChildren {
	trnTokens?: TrnTokens;
}

export function TrnTokenProvider({ children, trnTokens }: TrnTokenProviderProps) {
	const { prices } = useUsdPrices();
	const { data: tokens } = useFetchTrnTokens(trnTokens);

	const tokensWithPrices = useMemo(() => {
		if (!tokens) return undefined;
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

	const { data: pools, isFetching: isFetchingPools } = useFetchTrnPools(tokensWithPrices);

	const positions = useMemo(() => {
		if (!pools || !tokens || isFetchingPools) return null;

		const findToken = (assetId: number, tokens: TrnTokens): TrnToken | undefined => {
			return Object.values(tokens).find((token) => token.assetId === assetId);
		};

		return pools
			.sort((a, b) => (a.assetId > b.assetId ? 1 : -1))
			.map((pool) => {
				const lpToken = findToken(pool.assetId as number, tokens);
				const lpBalance = getTokenBalance(lpToken);

				if (!lpToken || !lpBalance || lpBalance.eq(0)) return null;

				const [xAssetId, yAssetId] = pool.poolKey.split("-").map(Number);
				const xToken = findToken(xAssetId, tokens);
				const yToken = findToken(yAssetId, tokens);

				if (!xToken || !yToken) return null;

				const poolShare = lpBalance.div(lpToken.supply).multipliedBy(100);

				return {
					assetId: pool.assetId,
					xToken,
					yToken,
					lpBalance,
					poolShare,
				};
			})
			.filter((pool): pool is Position => !!pool);
	}, [pools, tokens, getTokenBalance, isFetchingPools]);

	return (
		<TrnTokenContext.Provider
			value={{
				tokenBalances,
				getTokenBalance,
				refetchTokenBalances,
				pools: pools ?? [],
				tokens: tokensWithPrices ?? tokens ?? {},
				isFetching: isFetchingPools,
				position: positions ?? [],
			}}
		>
			{children}
		</TrnTokenContext.Provider>
	);
}

export function useTrnTokens() {
	return useContext(TrnTokenContext);
}
