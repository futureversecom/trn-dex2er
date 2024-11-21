import { useQuery } from "@tanstack/react-query";
import { AMMInfoRequest, AMMInfoResponse, Amount } from "xrpl";
import { isIssuedCurrency } from "xrpl/dist/npm/models/transactions/common";

import type { LiquidityPoolKey, LiquidityPoolsXrpl } from "../types";
import { type IXrplWalletProvider, normalizeCurrencyCode } from "../utils";

const fetchPoolData = async (
	xrplProvider?: IXrplWalletProvider,
	tokenPairs?: Array<AMMInfoRequest>
): Promise<LiquidityPoolsXrpl | undefined> => {
	if (!xrplProvider || !tokenPairs) return;

	let infoResponse: LiquidityPoolsXrpl = [];

	infoResponse = await Promise.all(
		tokenPairs.map(async (pair) => {
			const response = (await xrplProvider.request({
				...pair,
				ledger_index: "validated",
			})) as AMMInfoResponse;

			const formatLiquidity = (token: Amount) => (isIssuedCurrency(token) ? token.value : token);
			const formatKey = (token: Amount) =>
				isIssuedCurrency(token) ? normalizeCurrencyCode(token.currency) : "XRP";

			const poolKey =
				formatKey(response.result.amm.amount) + "-" + formatKey(response.result.amm.amount2);
			const token1Liquidity = formatLiquidity(response.result.amm.amount);
			const token2Liquidity = formatLiquidity(response.result.amm.amount2);
			const lpToken = response.result.amm.lp_token;

			// TODO 711 price in usd for single liquidity value
			return {
				poolKey: poolKey as LiquidityPoolKey,
				currency: response.result.amm.lp_token.currency,
				liquidity: [token1Liquidity, token2Liquidity],
				liquidityInUSD: undefined,
				lpTokenIssuer: lpToken.issuer,
				lpTokenSupply: response.result.amm.lp_token.value,
			};
		})
	);

	console.log("fetchPooldata info response ", infoResponse);

	return infoResponse;
};

export const useFetchXrplPools = (
	xrplProvider?: IXrplWalletProvider,
	tokenPairs?: Array<AMMInfoRequest>
) => {
	return useQuery({
		queryKey: ["poolData"],
		queryFn: () => fetchPoolData(xrplProvider, tokenPairs),
		refetchInterval: 6000,
	});
};
