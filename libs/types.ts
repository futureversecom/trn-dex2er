import * as sdk from "@futureverse/auth";
import { Static, Type } from "@sinclair/typebox";
import type { NetworkName } from "@therootnetwork/api";
import { deriveAddressPair } from "@therootnetwork/extrinsic";
import type BigNumber from "bignumber.js";
import * as Either from "fp-ts/Either";
import * as t from "io-ts";
import { getAddress, isAddress } from "viem";
import { isValidAddress } from "xrpl";
import type { AccountLinesTrustline, Balance } from "xrpl";

import { hush } from "@/libs/utils";

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

/*
 * The codecs below have been copied from the
 * futureverse identity monorepo
 * https://github.com/futureversecom/fv-identity-monorepo/. blob/main/apps/futureverse-identity-dashboard/common/**types/authMethod.ts
 */
const Address = new t.Type<`0x${string}`, `0x${string}`, unknown>(
	"Address",
	(s: unknown): s is `0x${string}` => typeof s === "string" && isAddress(s),
	(i, c) => {
		if (typeof i === "string" && isAddress(i)) {
			try {
				const ethereumAddress: string = getAddress(i);
				return t.success(ethereumAddress as `0x${string}`);
			} catch {
				return t.failure(i, c, "Expected a valid Ethereum-style address");
			}
		}
		return t.failure(i, c, "Expected a valid Ethereum-style address");
	},
	(x) => x
);
type Address = t.TypeOf<typeof Address>;

export type UserAuthenticationMethod =
	| {
			method: "fv:email";
			email: string;
	  }
	| {
			method: `fv:dynamic-custodial-idp`;
			idp: string;
			sub: string;
			name: string | undefined;
			email: string | undefined;
			darkIcon: string | undefined;
			lightIcon: string | undefined;
	  }
	| {
			method: "wagmi";
			eoa: `0x${string}`;
	  }
	| {
			method: "xaman";
			rAddress: string;
	  };

export const AuthMethodImpl = t.union([
	t.type({
		method: t.literal("fv:email"),
		email: t.string,
	}),
	t.type({
		method: t.literal("fv:dynamic-custodial-idp"),
		idp: t.string,
		sub: t.string,
		name: t.union([t.string, t.undefined]),
		email: t.union([t.string, t.undefined]),
		darkIcon: t.union([t.string, t.undefined]),
		lightIcon: t.union([t.string, t.undefined]),
	}),
	t.type({
		method: t.literal("wagmi"),
		eoa: Address,
	}),
	t.type({
		method: t.literal("xaman"),
		rAddress: t.string,
	}),
]);
export type AuthMethodImpl = t.TypeOf<typeof AuthMethodImpl>;

export const AuthMethod = new t.Type<AuthMethodImpl, null, string>(
	"Sub",
	(u): u is AuthMethodImpl => AuthMethodImpl.is(u),
	(u, c) => {
		const [type, ...rest] = u.split(":");
		switch (type) {
			case "email": {
				const email = rest.join(":");
				if (!email) return t.failure(u, c, "email is missing");
				return t.success({ method: `fv:email`, email });
			}
			case "idp": {
				const [idp, sub] = rest;
				if (!idp) return t.failure(u, c, "idp is missing");
				if (!sub) return t.failure(u, c, "sub is missing");
				return t.success({
					method: `fv:dynamic-custodial-idp`,
					idp: idp === "twitter" ? "X" : idp,
					sub,
					name: undefined, // will be populated later in useAuthenticationMethod
					email: undefined,
					darkIcon: undefined, // will be populated later in useAuthenticationMethod
					lightIcon: undefined, // will be populated later in useAuthenticationMethod
				});
			}
			case "eoa": {
				const eoa = hush(Address.decode(rest[0]));
				if (!eoa) return t.failure(u, c, "eoa is missing");
				return t.success({ method: "wagmi", eoa });
			}
			case "xrpl": {
				const [publicKey] = rest;
				if (!publicKey) {
					return t.failure(u, c, "publicKey is missing");
				}

				const [_, rAddress] = deriveAddressPair(publicKey);

				if (!rAddress) {
					return t.failure(u, c, "rAddress is not a valid");
				}

				return t.success({ method: "xaman", rAddress });
			}
			default:
				return t.failure(u, c);
		}
	},
	(_) => null
);
export type AuthMethod = t.TypeOf<typeof AuthMethod>;
