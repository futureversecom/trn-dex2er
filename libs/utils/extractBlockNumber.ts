/**
 * Extracts the block number from an extrinsic ID
 * @param extrinsicId - The extrinsic ID in format "blockNumber-extrinsicIndex"
 * @returns The block number with leading zeros removed, or "?" if invalid
 */
export function extractBlockNumber(extrinsicId: string): string {
	if (!extrinsicId) return "?";

	const blockNumber = extrinsicId.split("-")[0];
	return blockNumber.replace(/^0+/, "") || "?";
}
