import { ROOT_NETWORK } from "../constants";
import { XrplCurrency } from "../types";

type XrplCurrencies = Record<"swap" | "bridge", XrplCurrency[]>;

const mainnet: XrplCurrencies = {
	swap: [
		{
			currency: "XRP",
			decimals: 6,
		},
		{
			currency: "BTC",
			issuer: "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B",
			decimals: 18,
		},
		{
			currency: "USD",
			issuer: "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B",
			decimals: 6,
		},
		{
			currency: "CRYPTO",
			issuer: "rRbiKwcueo6MchUpMFDce9XpDwHhRLPFo",
		},
		{
			currency: "XGO",
			issuer: "rXGoXGoNeTTjPFVjzsmWWdFAMp7Lv3P4i",
		},
		{
			currency: "MAG",
			issuer: "rXmagwMmnFtVet3uL26Q2iwk287SRvVMJ",
		},
		{
			currency: "XPM",
			issuer: "rXPMxBeefHGxx2K7g5qmmWq3gFsgawkoa",
		},
		{
			currency: "RLT",
			issuer: "rUetS7kbVYJZ76za5ywa1DgViNZMgT9Bvq",
		},
	],
	bridge: [
		{
			currency: "XRP",
			decimals: 6,
		},
	],
};

const devnet: XrplCurrencies = {
	swap: [
		{
			currency: "XRP",
			decimals: 6,
		},
		{
			currency: "ETH",
			decimals: 18,
			issuer: "rpwY2B7RHSCPDsmdYjvsYxBLkzHXLhQykS",
		},
		{
			currency: "BTC",
			decimals: 18,
			issuer: "rNYjPW7NbiVDYy6K23b8ye6iZnowj4PsL7",
		},
	],
	bridge: [
		{
			currency: "XRP",
			decimals: 6,
		},
	],
};

export function getXrplCurrencies(page: "swap" | "bridge") {
	return ROOT_NETWORK.LinkedXrpChain === "mainnet" ? mainnet[page] : devnet[page];
}
