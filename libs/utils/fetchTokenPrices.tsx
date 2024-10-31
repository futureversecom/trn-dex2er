export async function fetchTokenPrices(): Promise<Record<string, number>> {
	const res = await fetch("/api/fetchTokenUSDPrices", {
		method: "GET",
	});

	if (!res.ok)
		throw new Error(`Failed to fetch token prices: (${res.status}): ${await res.text()}`);

	const { prices } = await res.json();

	return prices;
}
