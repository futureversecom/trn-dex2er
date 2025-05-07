import * as sdk from "@futureverse/auth";

import { TrnNetworkDetails, TrnToken, XrplNetworkDetails } from "./types";

export const FV_CLIENT_ID = process.env.NEXT_PUBLIC_FV_CLIENT_ID ?? "";

export const WC_PROJECT_ID = process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? "";

export const ROOT_NETWORK = {
	porcini: {
		NetworkName: "porcini",
		ChainName: "Porcini",
		ChainId: {
			InDec: 7672,
			InHex: `0x${Number(7672).toString(16)}`,
		},
		ApiUrl: {
			InWebSocket: process.env.NEXT_PUBLIC_CHAIN_RPC_ENDPOINT ?? "wss://porcini.rootnet.app/ws",
		},
		LinkedEthChain: "sepolia",
		LinkedXrpChain: process.env.NEXT_PUBLIC_LINKED_XRPL_CHAIN ?? "testnet",
		ExplorerUrl: "https://porcini.rootscan.io",
		Environment: sdk.ENVIRONMENTS["staging"],
		Stage: "staging" as sdk.Environment,
	},

	root: {
		NetworkName: "root",
		ChainName: "ROOT",
		ChainId: {
			InDec: 7668,
			InHex: `0x${Number(7668).toString(16)}`,
		},
		ApiUrl: {
			InWebSocket: process.env.NEXT_PUBLIC_CHAIN_RPC_ENDPOINT ?? "wss://root.rootnet.live/ws",
		},
		LinkedEthChain: "homestead",
		LinkedXrpChain: "livenet",
		ExplorerUrl: "https://rootscan.io",
		Environment: sdk.ENVIRONMENTS["production"],
		Stage: "production" as sdk.Environment,
	},
}[process.env.NEXT_PUBLIC_ROOT_NETWORK ?? "porcini"] as TrnNetworkDetails;

export const XRPL_NETWORK: XrplNetworkDetails = {
	devnet: {
		ApiUrl: {
			InWebSocket: "wss://s.devnet.rippletest.net:51233",
		},
		ExplorerUrl: {
			Bridge: "https://devnet.xrpl.org",
			Swap: "https://devnet.xrpl.org",
			Pool: "https://devnet.xrpl.org",
		},
		ChainId: {
			// TODO 768 find devnet chain id
			InDec: 0,
			InHex: `0x${Number(0).toString(16)}`,
		},
	},

	testnet: {
		ApiUrl: {
			InWebSocket: "wss://s.altnet.rippletest.net/",
		},
		ExplorerUrl: {
			Bridge: "https://testnet.xrpl.org",
			Swap: "https://testnet.xrpl.org",
			Pool: "https://testnet.xrpl.org",
		},
		ChainId: {
			InDec: 1601,
			InHex: `0x${Number(1601).toString(16)}`,
		},
	},

	livenet: {
		ApiUrl: {
			InWebSocket: "wss://ws.xrpl.int.futureverse.app/",
		},
		ExplorerUrl: "https://livenet.xrpl.org",
		ChainId: {
			InDec: 1600,
			InHex: `0x${Number(1600).toString(16)}`,
		},
	},
}[process.env.NEXT_PUBLIC_XRP_NETWORK ?? ROOT_NETWORK.LinkedXrpChain]!;

export const XRPL_BRIDGE_ADDRESS = process.env.NEXT_PUBLIC_XRPL_BRIDGE_ADDRESS ?? "";

export const CMC_TOKENS = {
	ROOT: "the-root-network",
	RLUSD: "ripple-usd",
	XRP: "xrp",
	ETH: "ethereum",
	SYLO: "sylo",
	USDC: "usd-coin",
	ASTO: "altered-state-token",
	USDT: "tether",
	IMX: "immutable-x",
	WBTC: "wrapped-bitcoin",
	DAI: "multi-collateral-dai",
	LINK: "chainlink",
	UNI: "uniswap",
	MATIC: "polygon",
	BTC: "bitcoin",
};

export const CMC_API_KEY = process.env.CMC_API_KEY ?? "";

export const DEFAULT_GAS_TOKEN = {
	assetId: 2,
	decimals: 6,
	symbol: "XRP",
} as TrnToken;

export const NETWORK_FEE_RATE = parseFloat(process.env.NEXT_PUBLIC_NETWORK_FEE_RATE ?? "0.05");

export const EXCHANGE_RATE = parseFloat(process.env.NEXT_PUBLIC_EXCHANGE_RATE ?? "0.3");

export const XRPL_BRIDGE_TOKENS = (process.env.NEXT_PUBLIC_XRPL_BRIDGE_TOKENS ?? "").split(",");

export const MONGO_API_URL = process.env.MONGO_API_URL ?? "";

export const MONGO_API_KEY = process.env.MONGO_API_KEY ?? "";

export const XAMAN_API_KEY = process.env.NEXT_PUBLIC_XAMAN_API_KEY ?? "";
