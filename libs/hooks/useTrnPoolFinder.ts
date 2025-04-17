import { useMemo } from "react";

import type { LiquidityPoolsRoot, TrnToken } from "@/libs/types";

import type { Position } from "../context/TrnTokenContext";

/**
 * Hook to find liquidity pools and positions for selected tokens
 */
export function useTrnPoolFinder(
	pools: LiquidityPoolsRoot,
	positions: Position[],
	xToken?: TrnToken,
	yToken?: TrnToken
) {
	// Find the liquidity pool for the selected tokens
	const liquidityPool = useMemo(() => {
		if (!xToken?.assetId || !yToken?.assetId) return undefined;

		const xAssetId = xToken.assetId;
		const yAssetId = yToken.assetId;

		return pools.find(({ poolKey }) => {
			const [x, y] = poolKey.split("-").map(Number);
			return (x === xAssetId && y === yAssetId) || (x === yAssetId && y === xAssetId);
		});
	}, [pools, xToken?.assetId, yToken?.assetId]);

	// Find the user's position in the selected pool
	const currentPosition = useMemo(() => {
		if (!liquidityPool) return undefined;

		const position = positions.find((pos) => pos.assetId === liquidityPool.assetId);
		if (!position) {
			console.warn("Failed to find LP position for assetId:", liquidityPool?.assetId);
			return undefined;
		}

		return position;
	}, [positions, liquidityPool]);

	return { liquidityPool, currentPosition };
}
