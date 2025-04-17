import type { LiquidityPoolRoot, TrnToken } from "@/libs/types";

import type { Position } from "../context/TrnTokenContext";
import { Balance } from "./index";
import { fetchSingleTrnToken } from "./index";

export interface PoolBalance {
	balance: Balance<TrnToken>;
	liquidity: Balance<TrnToken>;
}

export interface PoolBalances {
	x: PoolBalance;
	y: PoolBalance;
}

/**
 * Calculates pool balances for a user's position
 */
export async function calculateTrnPoolBalances({
	liquidityPool,
	currentPosition,
	xToken,
	yToken,
	trnApi,
}: {
	liquidityPool: LiquidityPoolRoot;
	currentPosition: Position;
	xToken: TrnToken;
	yToken: TrnToken;
	trnApi: any;
}): Promise<PoolBalances | undefined> {
	try {
		const asset = await fetchSingleTrnToken(currentPosition.assetId, trnApi);
		if (!asset) {
			throw new Error("Failed to fetch LP token data");
		}

		// Get asset IDs from pool key
		const [xAssetIdStr] = liquidityPool.poolKey.split("-");
		const xAssetId = Number(xAssetIdStr);

		// Calculate pool share
		const poolShare = currentPosition.poolShare.dividedBy(100);

		// Determine which liquidity index corresponds to which token
		const xLiquidityIndex = xAssetId === xToken.assetId ? 0 : 1;
		const yLiquidityIndex = 1 - xLiquidityIndex;

		// Create balance objects for total liquidity
		const xLiquidity = new Balance(liquidityPool.liquidity[xLiquidityIndex], xToken);
		const yLiquidity = new Balance(liquidityPool.liquidity[yLiquidityIndex], yToken);

		// Calculate user's share of the pool
		const xBalance = xLiquidity.multipliedBy(poolShare);
		const yBalance = yLiquidity.multipliedBy(poolShare);

		return {
			x: {
				balance: xBalance,
				liquidity: xLiquidity,
			},
			y: {
				balance: yBalance,
				liquidity: yLiquidity,
			},
		};
	} catch (error) {
		console.error("Error calculating pool balances:", error);
		throw error;
	}
}
