import type { ApiPromise } from "@polkadot/api";

import type { TrnTokens } from "../types";
import { humanToNumber } from "./humanToNumber";

export async function fetchTokenMetadata(trnApi: ApiPromise) {
	const entries = await trnApi.query.assets.metadata.entries();

	const tokens: TrnTokens = {};

	for (const [key, value] of entries) {
		const [assetId] = (key.toHuman() as [string]).map(humanToNumber);

		const metadata = value.toHuman() as {
			name: string;
			symbol: string;
			decimals: string;
		};

		const assetDetails = (await trnApi.query.assets.asset(assetId)).unwrap();
		const supply = humanToNumber(assetDetails.supply.toHuman() as string);

		tokens[assetId] = { ...metadata, assetId, decimals: +metadata.decimals, supply };
	}

	return tokens;
}
