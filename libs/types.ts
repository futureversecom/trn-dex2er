import * as sdk from "@futureverse/auth";
import { Static, Type } from "@sinclair/typebox";
import type { NetworkName } from "@therootnetwork/api";
import type BigNumber from "bignumber.js";
import { isAddress } from "ethers/lib/utils";
import * as Either from "fp-ts/Either";
import * as t from "io-ts";
import { isValidAddress } from "xrpl";
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

const extrinsicId = new t.Type<string, string, unknown>(
	"ExtrinsicId",
	(u): u is string => typeof u === "string",
	(input, context): Either.Either<t.Errors, string> => {
		const extrinsicIdRegex = /^\d+-\d+-\w+$/;
		if (typeof input !== "string") {
			return t.failure(input, context, "ExtrinsicId must be a string");
		}
		if (!extrinsicIdRegex.test(input)) {
			return t.failure(input, context, "Invalid ExtrinsicId format");
		}
		return t.success(input);
	},
	(a) => a
);

const evmAddress = new t.Type<string, string, unknown>(
	"EvMAddress",
	(u): u is string => typeof u === "string",
	(input, context): Either.Either<t.Errors, string> => {
		if (typeof input !== "string") {
			return t.failure(input, context, "EvMAddress must be a string");
		}
		if (!isAddress(input)) {
			return t.failure(input, context, "Invalid EvMAddress format");
		}
		return t.success(input);
	},
	(a) => a
);

const xrplAddress = new t.Type<string, string, unknown>(
	"XrplAddress",
	(u): u is string => typeof u === "string",
	(input, context): Either.Either<t.Errors, string> => {
		if (typeof input !== "string") {
			return t.failure(input, context, "XrplAddress must be a string");
		}
		if (!isValidAddress(input)) {
			return t.failure(input, context, "Invalid XrplAddress format");
		}
		return t.success(input);
	},
	(a) => a
);

const isoDate = new t.Type<string, string, unknown>(
	"ISODate",
	(u): u is string => typeof u === "string",
	(input, context): Either.Either<t.Errors, string> => {
		if (typeof input !== "string") {
			return t.failure(input, context, "ISODate must be a string");
		}
		const date = new Date(input);
		if (!isNaN(date.getTime()) && date.toISOString() === input) {
			return t.success(input);
		}
		return t.failure(input, context, "Invalid ISODate format");
	},
	(a) => a
);

const XrpValueCodec = t.type({
	amount: t.string,
	tokenName: t.string,
});

export const XrplBridgeTransactionC = t.array(
	t.type({
		from: t.union([evmAddress, xrplAddress]),
		to: t.union([evmAddress, xrplAddress]),
		sender: t.union([evmAddress, t.undefined]),
		status: t.string,
		createdAt: isoDate,
		updatedAt: isoDate,
		extrinsicId: extrinsicId,
		xrplHash: t.string,
		xrpValue: XrpValueCodec,
	})
);

export type XrplBridgeTransaction = t.TypeOf<typeof XrplBridgeTransactionC>;
