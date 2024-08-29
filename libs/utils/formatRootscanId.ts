import { ROOT_NETWORK } from "../constants";

export function formatRootscanId(extrinsicId: string) {
	if (ROOT_NETWORK.ChainName.includes("sprout")) return extrinsicId;

	const [block, index, _hash] = (extrinsicId as `${string}-${string}-${string}`).split("-");

	return `${parseInt(block).toString()}-${parseInt(index).toString()}`;
}
