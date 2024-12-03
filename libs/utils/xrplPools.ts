import { AMMInfoRequest } from "xrpl";

import { ROOT_NETWORK } from "../constants";

type XrplPools = Array<AMMInfoRequest>;

const mainnet: XrplPools = [
	{
		command: "amm_info",
		amm_account: "rEPnfqUepQBqgSGe1KdhyehydCdCdyb5ZS", // sylo root
	},
	{
		command: "amm_info",
		amm_account: "rHDpKsf4dbtta4AWktFiCaQS5zskWbhpC9", // asto root
	},
	{
		command: "amm_info",
		amm_account: "rL6wADSrdjdQgMNUWB6CuCzmPok9uaNdiN", // xrp root
	},
	{
		command: "amm_info",
		amm_account: "rsUqtLEUi9Yu6V3wJHe1YsmsTxDCUT7o3C", // xrp zrp
	},
	{
		command: "amm_info",
		amm_account: "rDJi8avQiXSDr1EkUMTp6kNY47vY5h2Hmu", // root zrp
	},
	{
		command: "amm_info",
		amm_account: "rQBeAghWHEwWvKShryBSa5yR3VRX9oyQ5T", // xrp btc x
	},
	{
		command: "amm_info",
		amm_account: "rEDFZUyyikyUbjNoMsSgmXfZNN53rwLLZv", // xrp eth x
	},
	{
		command: "amm_info",
		amm_account: "rGHt6LT5v9DVaEAmFzj5ciuxuj41ZjLofs", // xrp usdc
	},
	{
		command: "amm_info",
		amm_account: "rNXadcJukgtWKyMewxkDdz3CAYj7gG5nkY", // xrp usdt
	},
	{
		command: "amm_info",
		amm_account: "rprDM9hEWv7ACi1y9ZXrtRyySoWVLuU5zs", // xrp xlm
	},
	{
		command: "amm_info",
		amm_account: "r9ZKrNu1RJQg1UoqJ24pn5ZqynJg7rifGY", // xrp flr
	},
	{
		command: "amm_info",
		amm_account: "rJph4hcDHXEyyoe2CYM18McydukdTLvBhs", // xrp zrpy
	},
];

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
	// This is handy for testing so leaving here for now
	// {
	// 	command: "amm_info",
	// 	amm_account: "r9fAAcBBSjk5bcznLUkMoft598oTfYpTvG", // xrp doge
	// },
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
