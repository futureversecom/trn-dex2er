import * as sdk from "@futureverse/experience-sdk";
import { Static, Type } from "@sinclair/typebox";
import type { NetworkName } from "@therootnetwork/api";
import type BigNumber from "bignumber.js";
import type { AccountLinesTrustline, Balance as CurrencyBalance } from "xrpl";

export interface TrnToken {
	assetId: number;
	symbol: string;
	decimals: number;
	name: string;
	priceInUSD?: number;
	supply: number;
}

export type TrnTokens = Record<number, TrnToken>;

export interface TrnNetworkDetails {
	NetworkName: NetworkName;
	ChainName: string;
	ChainId: {
		InDec: number;
		InHex: string;
	};
	ApiUrl: {
		InWebSocket: string;
	};
	LinkedEthChain: string;
	LinkedXrpChain: string;
	ExplorerUrl: string;
	Environment: sdk.Environment;
	Stage: sdk.Stage;
}

export interface XrplNetworkDetails {
	ApiUrl: {
		InWebSocket: string;
	};
	ExplorerUrl: string;
}

export type LiquidityPoolKey = `${string}-${string}`;

export interface LiquidityPool {
	assetId: number;
	poolKey: LiquidityPoolKey;
	liquidity: [number, number];
	liquidityInUSD?: BigNumber;
}

export type LiquidityPools = Array<LiquidityPool>;

export interface XamanData {
	qrCodeImg?: string;
	deeplink?: string;
	progress?: "onCreated" | "onSignatureSuccess";
}

export type TokenSource = "x" | "y";

export type ContextTag = "review" | "sign" | "submit" | "submitted" | "failed";

export const XrplCurrency = Type.Object({
	currency: Type.String(),
	issuer: Type.Optional(Type.String()),
	decimals: Type.Optional(Type.Number()),
	priceInUSD: Type.Optional(Type.Number()),
});
export type XrplCurrency = Static<typeof XrplCurrency>;

export type XrplBalance = CurrencyBalance & {
	trustline?: AccountLinesTrustline;
};

export type IsTokenOpen = "xToken" | "yToken" | false;

export type Token = TrnToken | XrplCurrency;
