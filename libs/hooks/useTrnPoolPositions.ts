import { useEffect, useState } from "react";

import type { LiquidityPoolsRoot, TrnToken, TrnTokens } from "@/libs/types";

import type { Position } from "../context/TrnTokenContext";
import { fetchSingleTrnToken } from "../utils";
import { Balance } from "../utils";

export function useTrnPoolPositions(
	pools: LiquidityPoolsRoot,
	tokens: TrnTokens,
	getTokenBalance: (token: TrnToken) => Balance<TrnToken> | undefined,
	trnApi: any,
	isFetching: boolean
) {
	const [positions, setPositions] = useState<Position[]>([]);
	const [isLoadingPositions, setIsLoadingPositions] = useState(false);

	useEffect(() => {
		if (!pools || !tokens || isFetching) {
			return;
		}

		let isMounted = true;
		setIsLoadingPositions(true);

		const fetchPositions = async () => {
			try {
				const sortedPools = [...pools].sort((a, b) => (a.assetId > b.assetId ? 1 : -1));

				const positionsPromises = sortedPools.map(async (pool) => {
					const lpToken = tokens.get(pool.assetId as number);
					if (!lpToken) return null;

					const lpBalance = getTokenBalance(lpToken);
					if (!lpBalance || lpBalance.eq(0)) return null;

					let updatedSupply = lpToken.supply;
					try {
						const updatedToken = await fetchSingleTrnToken(pool.assetId, trnApi);
						if (updatedToken) {
							updatedSupply = updatedToken.supply;
						}
					} catch (error) {
						console.error(`Error fetching updated supply for token ${pool.assetId}:`, error);
					}

					const poolShare = lpBalance.div(updatedSupply).multipliedBy(100);
					const [xAssetId, yAssetId] = pool.poolKey.split("-").map(Number);

					return {
						assetId: pool.assetId,
						xToken: tokens.get(xAssetId),
						yToken: tokens.get(yAssetId),
						lpBalance,
						poolShare,
					};
				});

				const resolvedPositions = await Promise.all(positionsPromises);

				if (isMounted) {
					setPositions(resolvedPositions.filter((pool): pool is Position => !!pool));
				}
			} catch (error) {
				console.error("Error calculating positions:", error);
				if (isMounted) {
					setPositions([]);
				}
			} finally {
				if (isMounted) {
					setIsLoadingPositions(false);
				}
			}
		};

		fetchPositions();
		return () => {
			isMounted = false;
		};
	}, [pools, tokens, isFetching, getTokenBalance, trnApi]);

	return { positions, isLoadingPositions };
}
