import { useQuery } from "@tanstack/react-query";
import BigNumber from "bignumber.js";
import { AMMInfoRequest, AMMInfoResponse, Amount, Client, dropsToXrp } from "xrpl";
import { isIssuedCurrency } from "xrpl/dist/npm/models/transactions/common";

import { XRPL_NETWORK } from "../constants";
import type { LiquidityPoolKey, LiquidityPoolsXrpl } from "../types";
import { type IXrplWalletProvider, normalizeCurrencyCode } from "../utils";

const fetchPoolData = async (
	xrplProvider?: IXrplWalletProvider,
	tokenPairs?: Array<AMMInfoRequest>,
	currencyPrices?: Record<string, number>
): Promise<LiquidityPoolsXrpl | undefined> => {
	if (!tokenPairs || !currencyPrices) return;

	let infoResponse: LiquidityPoolsXrpl = [];

	const createClient = async () => {
		const client = new Client(XRPL_NETWORK.ApiUrl.InWebSocket);
		await client.connect();
		return client;
	};

	const provider = xrplProvider ? xrplProvider : await createClient();

	infoResponse = await Promise.all(
		tokenPairs.map(async (pair) => {
			const response = (await provider.request({
				...pair,
				ledger_index: "validated",
			})) as AMMInfoResponse;

			const formatLiquidity = (token: Amount) =>
				isIssuedCurrency(token) ? token.value : Number(dropsToXrp(token)).toFixed(0);
			const formatKey = (token: Amount) =>
				isIssuedCurrency(token) ? normalizeCurrencyCode(token.currency) : "XRP";

			const key1 = formatKey(response.result.amm.amount);
			const key2 = formatKey(response.result.amm.amount2);

			const poolKey = key1 + "-" + key2;
			const token1Liquidity = formatLiquidity(response.result.amm.amount);
			const token2Liquidity = formatLiquidity(response.result.amm.amount2);
			const lpToken = response.result.amm.lp_token;

			let liquidityInUSD: BigNumber | undefined;
			if (currencyPrices[key1] || currencyPrices[key2]) {
				const token1USDLiquidity = BigNumber(+token1Liquidity * (currencyPrices[key1] ?? 0));
				const token2USDLiquidity = BigNumber(+token2Liquidity * (currencyPrices[key2] ?? 0));

				liquidityInUSD = token1USDLiquidity.plus(token2USDLiquidity);
			}

			return {
				poolKey: poolKey as LiquidityPoolKey,
				currency: response.result.amm.lp_token.currency,
				liquidity: [token1Liquidity, token2Liquidity],
				liquidityInUSD: liquidityInUSD,
				lpTokenIssuer: lpToken.issuer,
				lpTokenSupply: response.result.amm.lp_token.value,
			};
		})
	);

	return infoResponse;
};

export const useFetchXrplPools = (
	xrplProvider?: IXrplWalletProvider,
	tokenPairs?: Array<AMMInfoRequest>,
	currencyPrices?: Record<string, number>
) => {
	return useQuery({
		queryKey: ["poolData"],
		queryFn: () => fetchPoolData(xrplProvider, tokenPairs, currencyPrices),
		refetchInterval: 3000,
	});
};
