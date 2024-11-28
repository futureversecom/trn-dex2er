import { AMMInfoRequest } from "xrpl";

import { ROOT_NETWORK } from "../constants";

type XrplPools = Array<AMMInfoRequest>;

const mainnet: XrplPools = [];

const devnet: XrplPools = [
	{
		command: "amm_info",
		amm_account: "rLkQBZQREBKzShjZBs4Pr8123Pp7gPDkho", // xrp btc
	},
	{
		command: "amm_info",
		amm_account: "rMfz4ZbTsJ1167AE5SSpTVzioEtSVzexJ6", // usdc usdt
	},
	{
		command: "amm_info",
		amm_account: "rMF72mBtd5YsD7ZC92RdjxghW1GXjsQv79", // btc eth
	},
	{
		command: "amm_info",
		amm_account: "rEPHjgstaFHfKKvxQZ1HZzNs5xW5ebBxgd", // xrp eth
	},
	{
		command: "amm_info",
		amm_account: "rntY2g4vDae8298kK1DkxocjB4RSZxu1Jj", // eth usdt
	},
];

const testnet: XrplPools = [
	{
		command: "amm_info",
		asset: { currency: "FLT", issuer: "roEdoQdW7nv6iqwTKG4C8zoEKWGh9StTX" },
		asset2: {
			currency: "XRP",
		},
	},
];

export function getXrplPools() {
	return ROOT_NETWORK.LinkedXrpChain === "livenet"
		? mainnet
		: ROOT_NETWORK.LinkedXrpChain === "testnet"
			? testnet
			: devnet;
}
