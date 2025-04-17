import type { ApiPromise } from "@polkadot/api";

import type { TrnToken } from "../types";
import { createTrnApi } from "./fetchTrnTokens";
import { humanToNumber } from "./humanToNumber";

/**
 * Fetches metadata for a single token by asset ID
 */
export async function fetchSingleTrnToken(
	assetId: number,
	api: ApiPromise | null
): Promise<TrnToken | null> {
	const localApi = api || (await createTrnApi());
	const shouldDisconnect = !api;

	try {
		const assetResult = await localApi.query.assets.asset(assetId);
		if (assetResult.isNone) return null;

		const metadataResult = await localApi.query.assets.metadata(assetId);
		const metadata = metadataResult.toHuman() as {
			name: string;
			symbol: string;
			decimals: string;
		};

		const assetDetails = assetResult.unwrap();
		const supply = humanToNumber(assetDetails.supply.toHuman() as string);

		return {
			...metadata,
			assetId,
			decimals: +metadata.decimals,
			supply,
		};
	} catch (error) {
		console.error(`Error fetching token data for asset ${assetId}:`, error);
		return null;
	} finally {
		if (shouldDisconnect) {
			void localApi.disconnect();
		}
	}
}
