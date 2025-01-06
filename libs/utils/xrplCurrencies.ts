import { convertStringToHex } from "xrpl";

import { ROOT_NETWORK } from "../constants";
import { XrplCurrency } from "../types";

export function getCurrencyCode(ticker: string) {
	return convertStringToHex(ticker).padEnd(40, "0");
}

type XrplCurrencies = Record<"swap" | "bridge" | "pool", XrplCurrency[]>;

const mainnet: XrplCurrencies = {
	swap: [
		{
			currency: "XRP",
			decimals: 6,
		},
		{
			ticker: "RLUSD",
			currency: getCurrencyCode("RLUSD"),
			issuer: "rPaqStERf9Te6HzbQKrcQW6bhiVRgphZsA",
			decimals: 18,
		},
		{
			ticker: "ROOT",
			currency: getCurrencyCode("ROOT"),
			issuer: "r9MrRER8UKSAumcqvbwCAsyWbUKomz68i3",
			decimals: 6,
		},
		{
			ticker: "SYLO",
			currency: getCurrencyCode("SYLO"),
			issuer: "rNhK8hNWEjsXvfGE4Lzso517ms6odD7dnn",
			decimals: 18,
		},
		{
			ticker: "ASTO",
			currency: getCurrencyCode("ASTO"),
			issuer: "rpFEEHBkoFwK3J9Mzi426PvTzGEMZizEh1",
			decimals: 18,
		},
		{
			currency: "ZRP",
			issuer: "rZapJ1PZ297QAEXRGu3SZkAiwXbA7BNoe",
			decimals: 8,
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
			ticker: "CRYPTO",
			currency: getCurrencyCode("CRYPTO"),
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
	pool: [
		{
			ticker: "RLUSD",
			currency: getCurrencyCode("RLUSD"),
			issuer: "rPaqStERf9Te6HzbQKrcQW6bhiVRgphZsA",
			decimals: 18,
		},
		{
			currency: "BTC",
			issuer: "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B",
			decimals: 18,
		},
		{
			currency: "ZRP",
			issuer: "rZapJ1PZ297QAEXRGu3SZkAiwXbA7BNoe",
			decimals: 8,
		},
		{
			currency: "XRP",
			decimals: 6,
		},
		{
			ticker: "ETH",
			currency: getCurrencyCode("ETH"),
			issuer: "rcA8X3TVMST1n3CJeAdGk1RdRCHii7N2h",
			decimals: 6,
		},
		{
			ticker: "USDC",
			currency: getCurrencyCode("USDC"),
			issuer: "rcEGREd8NmkKRE8GE424sksyt1tJVFZwu",
			decimals: 6,
		},
		{
			ticker: "USDT",
			currency: getCurrencyCode("USDT"),
			issuer: "rcvxE9PS9YBwxtGg1qNeewV6ZB3wGubZq",
			decimals: 6,
		},
		{
			ticker: "XLM",
			currency: getCurrencyCode("XLM"),
			issuer: "rKiCet8SdvWxPXnAgYarFUXMh1zCPz432Y",
		},
		{
			ticker: "FLR",
			currency: getCurrencyCode("FLR"),
			issuer: "rcxJwVnftZzXqyH9YheB8TgeiZUhNo1Eu",
		},
		{
			ticker: "ZRPY",
			currency: getCurrencyCode("ZRPY"),
			issuer: "rsxkrpsYaeTUdciSFJwvto7MKSrgGnvYvA",
		},
		{
			ticker: "ROOT",
			currency: getCurrencyCode("ROOT"),
			issuer: "r9MrRER8UKSAumcqvbwCAsyWbUKomz68i3",
			decimals: 6,
		},
		{
			ticker: "SYLO",
			currency: getCurrencyCode("SYLO"),
			issuer: "rNhK8hNWEjsXvfGE4Lzso517ms6odD7dnn",
			decimals: 18,
		},
		{
			ticker: "ASTO",
			currency: getCurrencyCode("ASTO"),
			issuer: "rpFEEHBkoFwK3J9Mzi426PvTzGEMZizEh1",
			decimals: 18,
		},
	],
	bridge: [
		{
			currency: "XRP",
			decimals: 6,
		},
		{
			ticker: "RLUSD",
			currency: getCurrencyCode("RLUSD"),
			issuer: "rPaqStERf9Te6HzbQKrcQW6bhiVRgphZsA",
			decimals: 18,
		},
		{
			ticker: "ROOT",
			currency: getCurrencyCode("ROOT"),
			issuer: "r9MrRER8UKSAumcqvbwCAsyWbUKomz68i3",
			decimals: 6,
		},
		{
			ticker: "SYLO",
			currency: getCurrencyCode("SYLO"),
			issuer: "rNhK8hNWEjsXvfGE4Lzso517ms6odD7dnn",
			decimals: 18,
		},
		{
			ticker: "ASTO",
			currency: getCurrencyCode("ASTO"),
			issuer: "rpFEEHBkoFwK3J9Mzi426PvTzGEMZizEh1",
			decimals: 18,
		},
		{
			currency: "ZRP",
			issuer: "rZapJ1PZ297QAEXRGu3SZkAiwXbA7BNoe",
			decimals: 8,
		},
	],
};

const testnet: XrplCurrencies = {
	swap: [
		{
			currency: "XRP",
			decimals: 6,
		},
		{
			ticker: "RLUSD",
			currency: getCurrencyCode("RLUSD"),
			issuer: "rPaqStERf9Te6HzbQKrcQW6bhiVRgphZsA",
			decimals: 18,
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
	pool: [
		{
			currency: "XRP",
			decimals: 6,
		},
		{
			ticker: "RLUSD",
			currency: getCurrencyCode("RLUSD"),
			issuer: "rPaqStERf9Te6HzbQKrcQW6bhiVRgphZsA",
			decimals: 18,
		},
		{
			decimals: 6,
			ticker: "ROOT",
			currency: getCurrencyCode("ROOT"),
			issuer: "rPaqStERf9Te6HzbQKrcQW6bhiVRgphZsA",
		},
		{
			decimals: 18,
			currency: "ZRP",
			issuer: "rPaqStERf9Te6HzbQKrcQW6bhiVRgphZsA",
		},
		{
			decimals: 6,
			ticker: "USDC",
			currency: getCurrencyCode("USDC"),
			issuer: "rPaqStERf9Te6HzbQKrcQW6bhiVRgphZsA",
		},
		{
			decimals: 6,
			ticker: "USDT",
			currency: getCurrencyCode("USDT"),
			issuer: "rPaqStERf9Te6HzbQKrcQW6bhiVRgphZsA",
		},
		{
			decimals: 18,
			ticker: "ASTO",
			currency: getCurrencyCode("ASTO"),
			issuer: "rPaqStERf9Te6HzbQKrcQW6bhiVRgphZsA",
		},
		{
			decimals: 18,
			ticker: "SYLO",
			currency: getCurrencyCode("SYLO"),
			issuer: "rPaqStERf9Te6HzbQKrcQW6bhiVRgphZsA",
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
		{
			currency: "TST",
			issuer: "rnok9ePZWgheay8BodttsUgceXf7QDF9d6",
		},
		{
			currency: "FLT",
			issuer: "roEdoQdW7nv6iqwTKG4C8zoEKWGh9StTX",
		},
	],
	bridge: [
		{
			currency: "XRP",
			decimals: 6,
		},
		{
			ticker: "RLUSD",
			currency: getCurrencyCode("RLUSD"),
			issuer: "rPaqStERf9Te6HzbQKrcQW6bhiVRgphZsA",
			decimals: 18,
		},
		{
			decimals: 6,
			ticker: "ROOT",
			currency: getCurrencyCode("ROOT"),
			issuer: "rPaqStERf9Te6HzbQKrcQW6bhiVRgphZsA",
		},
		{
			decimals: 18,
			currency: "ZRP",
			issuer: "rPaqStERf9Te6HzbQKrcQW6bhiVRgphZsA",
		},
		{
			decimals: 6,
			ticker: "USDC",
			currency: getCurrencyCode("USDC"),
			issuer: "rPaqStERf9Te6HzbQKrcQW6bhiVRgphZsA",
		},
		{
			decimals: 6,
			ticker: "USDT",
			currency: getCurrencyCode("USDT"),
			issuer: "rPaqStERf9Te6HzbQKrcQW6bhiVRgphZsA",
		},
		{
			decimals: 18,
			ticker: "ASTO",
			currency: getCurrencyCode("ASTO"),
			issuer: "rPaqStERf9Te6HzbQKrcQW6bhiVRgphZsA",
		},
		{
			decimals: 18,
			ticker: "SYLO",
			currency: getCurrencyCode("SYLO"),
			issuer: "rPaqStERf9Te6HzbQKrcQW6bhiVRgphZsA",
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
	pool: [
		{
			currency: "XRP",
			decimals: 6,
		},

		{
			decimals: 6,
			currency: "USDC",
			issuer: "rrnhCibA8Vo1t7veoSUGJCXpW6xv1c45Fq",
		},
		{
			decimals: 6,
			currency: "USDT",
			issuer: "rax5V9EiMfTo7fUxyxBrN48PVFwKqTYLPf",
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
		{
			ticker: "DOGE",
			currency: getCurrencyCode("DOGE"),
			issuer: "rEz3WMt5ZB36HfcLavkhvM1y2UeVMQJzCU",
		},
		{
			ticker: "ASTO",
			currency: getCurrencyCode("ASTO"),
			issuer: "rpFEEHBkoFwK3J9Mzi426PvTzGEMZizEh1",
			decimals: 18,
		},
	],
	bridge: [
		{
			currency: "XRP",
			decimals: 6,
		},
		{
			decimals: 6,
			ticker: "ROOT",
			currency: getCurrencyCode("ROOT"),
			issuer: "rPaqStERf9Te6HzbQKrcQW6bhiVRgphZsA",
		},
		{
			decimals: 18,
			currency: "ZRP",
			issuer: "rPaqStERf9Te6HzbQKrcQW6bhiVRgphZsA",
		},
		{
			decimals: 6,
			ticker: "USDC",
			currency: getCurrencyCode("USDC"),
			issuer: "rPaqStERf9Te6HzbQKrcQW6bhiVRgphZsA",
		},
		{
			decimals: 6,
			ticker: "USDT",
			currency: getCurrencyCode("USDT"),
			issuer: "rPaqStERf9Te6HzbQKrcQW6bhiVRgphZsA",
		},
		{
			decimals: 18,
			ticker: "ASTO",
			currency: getCurrencyCode("ASTO"),
			issuer: "rPaqStERf9Te6HzbQKrcQW6bhiVRgphZsA",
		},
		{
			decimals: 18,
			ticker: "SYLO",
			currency: getCurrencyCode("SYLO"),
			issuer: "rPaqStERf9Te6HzbQKrcQW6bhiVRgphZsA",
		},
	],
};

export function getXrplCurrencies(page: "swap" | "bridge" | "pool") {
	return ROOT_NETWORK.LinkedXrpChain === "livenet"
		? mainnet[page]
		: ROOT_NETWORK.LinkedXrpChain === "testnet"
			? testnet[page]
			: devnet[page];
}
