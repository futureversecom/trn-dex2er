import { ApiPromise } from "@polkadot/api";
import { getApiOptions, getPublicProvider } from "@therootnetwork/api";

import { ROOT_NETWORK } from "@/libs/constants";

import { fetchTokenMetadata } from "./fetchTokenMetadata";

export async function fetchTrnTokens() {
	const api = await ApiPromise.create({
		...getApiOptions(),
		...getPublicProvider(ROOT_NETWORK.NetworkName),
	});

	await api.isReady;

	const tokens = await fetchTokenMetadata(api);

	void api.disconnect();

	return tokens;
}
