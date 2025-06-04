import { useTrnApi } from "@futureverse/transact-react";
import type { Option, u32 } from "@polkadot/types";
import { useQuery } from "@tanstack/react-query";
import BigNumber from "bignumber.js";

import type { LiquidityPoolKey, LiquidityPoolRoot, LiquidityPoolsRoot, TrnTokens } from "../types";
import { Balance, humanToNumber } from "../utils";

export function useFetchTrnPools(tokens?: TrnTokens | undefined) {
	const { trnApi } = useTrnApi();

	return useQuery({
		queryKey: ["trnLiquidityPools"],
		queryFn: async (): Promise<LiquidityPoolsRoot | undefined> => {
			if (!trnApi?.isReady || !tokens) return;

			const entries = await trnApi.query.dex.liquidityPool.entries();

			const pools = await Promise.all(
				entries.map(async ([key, value]) => {
					const [assetIds] = key.toHuman() as [[string, string]];
					const poolKey = assetIds.map(humanToNumber).join("-");

					const liquidity = value.toHuman() as [string, string];
					const [token1Liquidity, token2Liquidity] = liquidity.map(humanToNumber);

					const lpToken = (await trnApi.query.dex.tradingPairLPToken(
						assetIds.map(humanToNumber)
					)) as Option<u32>;

					const lpTokenSupply = lpToken.isSome
						? (await trnApi.query.assets.asset(lpToken.unwrap())).unwrapOr(null)
						: null;

					const token1 = tokens.get(humanToNumber(assetIds[0]));
					const token2 = tokens.get(humanToNumber(assetIds[1]));

					if (!token1 || !token2) return null;

					let liquidityInUSD: BigNumber | undefined;
					if (token1.priceInUSD || token2.priceInUSD) {
						const token1LiquidiyUnit = new Balance(token1Liquidity, token1).toUnit();
						const token2LiquidiyUnit = new Balance(token2Liquidity, token2).toUnit();

						const token1USDLiquidity = BigNumber(
							token1LiquidiyUnit.multipliedBy(token1.priceInUSD ?? 0)
						);
						const token2USDLiquidity = BigNumber(
							token2LiquidiyUnit.multipliedBy(token2.priceInUSD ?? 0)
						);

						liquidityInUSD = token1USDLiquidity.plus(token2USDLiquidity);
					}

					return {
						poolKey: poolKey as LiquidityPoolKey,
						assetId: humanToNumber(lpToken.unwrap().toHuman() as string),
						liquidity: [token1Liquidity, token2Liquidity] as [number, number],
						liquidityInUSD: liquidityInUSD?.gt(0) ? liquidityInUSD : undefined,
						lpTokenSupply: lpTokenSupply ? lpTokenSupply.supply.toString() : undefined,
					};
				})
			);

			return pools.filter((pool) => pool !== null) as LiquidityPoolRoot[];
		},
		enabled: !!trnApi?.isReady && !!tokens,
		refetchInterval: 60000,
	});
}
