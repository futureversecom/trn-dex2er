import * as sdk from "@futureverse/auth";
import { Static, Type } from "@sinclair/typebox";
import type { NetworkName } from "@therootnetwork/api";
import type BigNumber from "bignumber.js";
import type { AccountLinesTrustline, Balance } from "xrpl";

export interface TrnToken {
	assetId: number;
	symbol: string;
	decimals: number;
	name: string;
	priceInUSD?: number;
	supply: number;
}

export type TrnTokens = Map<number, TrnToken>;

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
	Environment: sdk.EnvironmentInfo;
	Stage: sdk.Environment;
}

export interface XrplNetworkDetails {
	ApiUrl: {
		InWebSocket: string;
	};
	ChainId: {
		InDec: number;
		InHex: string;
	};
	ExplorerUrl: string | { Bridge: string; Swap: string; Pool: string };
}

export type LiquidityPoolKey = `${string}-${string}`;

export interface LiquidityPoolRoot {
	assetId: number;
	poolKey: LiquidityPoolKey;
	liquidity: [number, number];
	liquidityInUSD?: BigNumber;
	lpTokenIssuer?: string;
	lpTokenSupply?: string;
}

export type LiquidityPoolsRoot = Array<LiquidityPoolRoot>;

export type LiquidityPoolXrpl = Omit<LiquidityPoolRoot, "assetId" | "liquidity"> & {
	currency: string;
	liquidity: [string, string];
};

export type LiquidityPoolsXrpl = Array<LiquidityPoolXrpl>;

export interface XamanData {
	qrCodeImg?: string;
	deeplink?: string;
	progress?: "onCreated" | "onSignatureSuccess";
}

export type TokenSource = "x" | "y";

export type ContextTag = "review" | "sign" | "submit" | "submitted" | "failed";

export const XrplCurrency = Type.Object({
	ticker: Type.Optional(Type.String()),
	currency: Type.String(),
	issuer: Type.Optional(Type.String()),
	decimals: Type.Optional(Type.Number()),
	priceInUSD: Type.Optional(Type.Number()),
});
export type XrplCurrency = Static<typeof XrplCurrency>;

export type XrplBalance = Balance & {
	trustline?: AccountLinesTrustline;
};

export type IsTokenOpen = "xToken" | "yToken" | false;

export type Token = TrnToken | XrplCurrency;

export type XrplBridgeTransaction = {
	from: string;
	to: string;
	sender?: string;
	status: string;
	createdAt: string;
	updatedAt: string;
	extrinsicId: string;
	xrplHash: string;
	xrpValue: {
		amount: string;
		tokenName: string;
	};
};
