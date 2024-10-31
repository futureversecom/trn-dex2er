import { CMC_API_KEY, CMC_TOKENS } from "@/libs/constants";

export const revalidate = 60;

interface TokenPrice {
	name: string;
	symbol: string;
	quote: {
		USD: {
			price: number;
		};
	};
}

interface PriceResponse {
	data: Record<string, TokenPrice>;
}

interface TokenPrices {
	[symbol: string]: number;
}

export async function GET() {
	const result = await fetch(
		`https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?slug=${Object.values(
			CMC_TOKENS
		).join(",")}`,
		{
			method: "GET",
			headers: {
				"X-CMC_PRO_API_KEY": CMC_API_KEY,
			},
		}
	);

	if (!result.ok) {
		throw await result.text();
	}

	const { data } = (await result.json()) as PriceResponse;

	const prices = Object.values(data).reduce<TokenPrices>(
		(acc, curr) => ({ ...acc, [curr.symbol]: curr.quote.USD.price }),
		{}
	);

	return Response.json({ prices });
}
