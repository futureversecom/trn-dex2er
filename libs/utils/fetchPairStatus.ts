import type { ApiPromise } from "@polkadot/api";

export async function fetchPairStatus(api: ApiPromise, pair: [number, number]) {
	const status = await api.rpc.dex.getTradingPairStatus(...pair);

	return status.toString() === "Enabled";
}
