import {
	AMMCreate,
	AMMDeposit,
	type AMMInfoRequest,
	AMMWithdraw,
	type Amount,
	Currency,
	dropsToXrp,
	IssuedCurrency,
	type Payment,
	ServerStateResponse,
	TrustSet,
	xrpToDrops,
} from "xrpl";
import { isIssuedCurrency } from "xrpl/dist/npm/models/transactions/common";

import type { XrplCurrency } from "@/libs/types";
import { getCurrencyCode, type IXrplWalletProvider, toFixed } from "@/libs/utils";

import { ROOT_NETWORK, XRPL_NETWORK } from "../constants";

const ISO_REGEX = /^[A-Z0-9a-z?!@#$%^&*(){}[\]|]{3,4}$/;

export const normalizeCurrencyCode = (currencyCode: string, maxLength = 20) => {
	if (!currencyCode) return "";

	if (currencyCode.length <= 4) {
		return currencyCode;
	}

	if (currencyCode.match(/^[a-fA-F0-9]{40}$/) && !isNaN(parseInt(currencyCode, 16))) {
		// Hexadecimal currency code
		const hex = currencyCode.toString().replace(/(00)+$/g, "");
		if (hex.startsWith("02")) {
			// https://github.com/XRPLF/XRPL-Standards/discussions/37
			const xlf15d = Buffer.from(hex, "hex").slice(8).toString("utf-8").slice(0, maxLength).trim();
			if (xlf15d.match(/[a-zA-Z0-9]{3,}/) && xlf15d.toLowerCase() !== "xrp") {
				return xlf15d;
			}
		}
		const decodedHex = Buffer.from(hex, "hex").toString("utf-8").slice(0, maxLength).trim();
		if (decodedHex.match(/[a-zA-Z0-9]{3,}/) && decodedHex.toLowerCase() !== "xrp") {
			// ASCII or UTF-8 encoded alphanumeric code, 3+ characters long
			return decodedHex;
		}
	}
	return "";
};

export const getRatioAndAmounts = async (
	provider: IXrplWalletProvider,
	asset1Currency: XrplCurrency,
	asset2Currency: XrplCurrency,
	inputAmount: string,
	direction: "from" | "to",
	slippage: number // 5 (percentage)
) => {
	const amm_info = (await getAmmInfo(provider, asset1Currency, asset2Currency)) as any;
	const amm = amm_info?.result?.amm;

	console.log("amm: ", amm);

	const tradingFeePercentage = amm.trading_fee / 100000; // Normalize trading fee to a percentage

	let tradingFeeAmount, ratio, fromAmount, toAmount, amountMin;

	if (direction === "from") {
		fromAmount =
			asset1Currency.currency === "XRP" ? Number(xrpToDrops(inputAmount)) : Number(inputAmount);
		tradingFeeAmount = fromAmount * tradingFeePercentage;
		fromAmount -= tradingFeeAmount; // Adjust "from" amount for the trading fee

		ratio =
			(isIssuedCurrency(amm.amount2) ? Number(amm.amount2.value) : Number(amm.amount2)) /
			(isIssuedCurrency(amm.amount) ? Number(amm.amount.value) : Number(amm.amount));
		toAmount = fromAmount * ratio;
		amountMin = toAmount * (1 - slippage / 100);
		return {
			ratio,
			fromAmount: dropToCurrency(asset1Currency.currency, fromAmount.toString()),
			toAmount: dropToCurrency(asset2Currency.currency, toAmount.toString()),
			amountMin: dropToCurrency(asset2Currency.currency, amountMin.toString()),
			tradingFee: tradingFeePercentage,
			tradingFeeAmount: tradingFeeAmount.toString(),
		};
	} else {
		toAmount =
			asset1Currency.currency === "XRP" ? Number(xrpToDrops(inputAmount)) : Number(inputAmount);
		ratio =
			(isIssuedCurrency(amm.amount) ? Number(amm.amount.value) : Number(amm.amount)) /
			(isIssuedCurrency(amm.amount2) ? Number(amm.amount2.value) : Number(amm.amount2));

		// Reverse calculation for "from" amount before trading fee adjustment
		const estimatedFromAmount = toAmount / ratio;

		// Adjust "from" amount for trading fee to ensure the desired "to" amount is achieved
		fromAmount = estimatedFromAmount / (1 - tradingFeePercentage);
		tradingFeeAmount = fromAmount * tradingFeePercentage; // Recalculate trading fee based on adjusted "from" amount

		amountMin = toAmount * (1 - slippage / 100); // Slippage already considered for "to" amount
		return {
			ratio,
			fromAmount: dropToCurrency(asset2Currency.currency, fromAmount.toString()),
			toAmount: dropToCurrency(asset1Currency.currency, toAmount.toString()),
			amountMin: dropToCurrency(asset1Currency.currency, amountMin.toString()),
			tradingFee: tradingFeePercentage,
			tradingFeeAmount: tradingFeeAmount.toString(),
		};
	}
};

export async function getAmmInfo(
	provider: IXrplWalletProvider,
	asset: XrplCurrency,
	asset2: XrplCurrency
) {
	const ammInfoRequest: AMMInfoRequest = {
		command: "amm_info",
		ledger_index: "validated",
		limit: 10,

		asset: asset as any,
		asset2: asset2 as any,
	};

	return await provider.request(ammInfoRequest);
}

export function dropToCurrency(currency: string, amount: string) {
	if (currency === "XRP") {
		if (amount.includes(".")) {
			const integer = Number(dropsToXrp(amount.split(".")[0]));
			return `${integer}`;
		}
		return Number(dropsToXrp(amount)).toFixed(6);
	}
	return Number(amount).toFixed(8);
}

export function buildCreateTrustLineTx(account: string, token: IssuedCurrency) {
	const trustSetReq = {
		Account: account,
		LimitAmount: { ...token, value: "10000000000" },
		TransactionType: "TrustSet",
	} as TrustSet;

	console.log("build trust set tx ", trustSetReq);

	return trustSetReq;
}

export function buildPaymentTx(
	walletAddress: string,
	fromCurrency: XrplCurrency,
	fromAmount: string,
	toCurrency: XrplCurrency,
	toAmount: string,
	toAmountMin: string
) {
	let sendMax;
	let deliverAmount;
	let deliverMinAmount;
	if (fromCurrency.currency === "XRP") {
		sendMax = xrpToDrops(fromAmount) as Amount;
	} else {
		const { currency, issuer } = fromCurrency;
		sendMax = {
			currency,
			issuer,
			value: fromAmount,
		} as Amount;
	}

	if (toCurrency.currency === "XRP") {
		deliverAmount = xrpToDrops(toAmount) as Amount;
		deliverMinAmount = xrpToDrops(toAmountMin) as Amount;
	} else {
		const { currency, issuer } = toCurrency;
		deliverAmount = {
			currency,
			issuer,
			value: toAmount,
		} as Amount;
		deliverMinAmount = {
			currency,
			issuer,
			value: toAmountMin,
		} as Amount;
	}

	const crossCurrencyPaymentTx: Payment = {
		TransactionType: "Payment",
		Account: walletAddress,
		Amount: deliverAmount,
		DeliverMin: deliverMinAmount,
		Destination: walletAddress,
		SendMax: sendMax,
		Flags: {
			tfPartialPayment: true,
		},
	};

	return crossCurrencyPaymentTx;
}

export function formatTxInput(token: { currency: string; issuer?: string }, amount: string) {
	return token.issuer
		? { ...token, issuer: token.issuer as string, value: toFixed(+amount) }
		: xrpToDrops(toFixed(+amount, 6));
}

export function xrplCurrencytoCurrency(token: XrplCurrency): Currency {
	const assetOne: Currency =
		token.currency === "XRP"
			? { currency: "XRP" }
			: ({
					currency: token.currency,
					issuer: token.issuer,
				} as IssuedCurrency);

	return assetOne;
}

function createAMMInfoRequest(asset: Currency, asset2: Currency): AMMInfoRequest {
	return {
		command: "amm_info",
		ledger_index: "validated",
		limit: 10,

		asset: asset,
		asset2: asset2,
	} as AMMInfoRequest;
}

export async function checkAmmExists(
	provider: IXrplWalletProvider,
	asset: Currency,
	asset2: Currency
) {
	let assetOneModified: Currency = asset;
	if (ISO_REGEX.test(asset.currency) && asset.currency != "XRP") {
		assetOneModified = {
			...assetOneModified,
			currency: getCurrencyCode(asset.currency),
		} as IssuedCurrency;
	} else {
		assetOneModified = {
			...assetOneModified,
			currency: normalizeCurrencyCode(asset.currency),
		} as IssuedCurrency;
	}

	let assetTwoModified: Currency = asset2;
	if (ISO_REGEX.test(asset2.currency) && asset2.currency != "XRP") {
		assetTwoModified = {
			...assetTwoModified,
			currency: getCurrencyCode(asset2.currency),
		} as IssuedCurrency;
	} else {
		assetTwoModified = {
			...assetTwoModified,
			currency: normalizeCurrencyCode(asset2.currency),
		} as IssuedCurrency;
	}

	const reqs = [
		createAMMInfoRequest(asset, asset2),
		createAMMInfoRequest(asset, assetTwoModified),
		createAMMInfoRequest(assetOneModified, asset2),
		createAMMInfoRequest(assetOneModified, assetTwoModified),
	];

	const exists = (
		await Promise.all(
			reqs.map(async (r) => {
				try {
					await provider.request(r);
					return true;
				} catch (err: any) {
					return false;
				}
			})
		)
	).some((r) => r);

	return exists;
}

// https://xrpl.org/docs/references/protocol/transactions/types/ammcreate#special-transaction-cost
export const getAmmcost = async (
	xrplProvider?: IXrplWalletProvider
): Promise<string | undefined> => {
	if (!xrplProvider) return undefined;
	const ss = (await xrplProvider.request({
		command: "server_state",
	})) as ServerStateResponse;
	const amm_fee_drops = ss.result.state.validated_ledger!.reserve_inc.toString();

	return amm_fee_drops;
};

// https://xrpl.org/docs/references/protocol/transactions/types/ammcreate
export function buildCreateAmmTx(
	walletAddress: string,
	TokenOne: Amount,
	TokenTwo: Amount,
	TradingFee: number,
	amm_fee_drops: string
): AMMCreate {
	const formatAmount = (token: Amount) =>
		isIssuedCurrency(token)
			? { currency: token.currency, issuer: token.issuer, value: token.value }
			: token;

	const create: AMMCreate = {
		TransactionType: "AMMCreate",
		Account: walletAddress,
		Amount: formatAmount(TokenOne),
		Amount2: formatAmount(TokenTwo),
		TradingFee: TradingFee * 1000, // scale trading fee between 0 - 1000
		Fee: amm_fee_drops,
	};

	return create;
}

// https://xrpl.org/docs/references/protocol/transactions/types/ammdeposit
// TODO double and single asset deposit
export function buildDepositAmmTx(
	walletAddress: string,
	TokenOne: Amount,
	TokenTwo: Amount
): AMMDeposit {
	const formatAmount = (token: Amount) =>
		isIssuedCurrency(token)
			? { currency: token.currency, issuer: token.issuer, value: token.value }
			: token;

	const depo: AMMDeposit = {
		TransactionType: "AMMDeposit",
		Account: walletAddress,
		Amount: formatAmount(TokenOne),
		Amount2: formatAmount(TokenTwo),
		Asset: isIssuedCurrency(TokenOne)
			? { currency: TokenOne.currency, issuer: TokenOne.issuer }
			: { currency: "XRP" },
		Asset2: isIssuedCurrency(TokenTwo)
			? { currency: TokenTwo.currency, issuer: TokenTwo.issuer }
			: { currency: "XRP" },
		Flags: 1048576, // Keps the balance of the amm deposits up to the users specification 0x00100000 tfTwoAsset
	};

	return depo as AMMDeposit;
}

// https://xrpl.org/docs/references/protocol/transactions/types/ammwithdraw
export function buildWithdrawAmmTx(
	walletAddress: string,
	TokenOne: Amount,
	TokenTwo: Amount
): AMMWithdraw {
	const formatAmount = (token: Amount) =>
		isIssuedCurrency(token)
			? { currency: token.currency, issuer: token.issuer, value: token.value }
			: token;

	const withdraw: AMMWithdraw = {
		TransactionType: "AMMWithdraw",
		Account: walletAddress,
		Amount: formatAmount(TokenOne),
		Amount2: formatAmount(TokenTwo),
		Asset: isIssuedCurrency(TokenOne)
			? { currency: TokenOne.currency, issuer: TokenOne.issuer }
			: { currency: "XRP" },
		Asset2: isIssuedCurrency(TokenTwo)
			? { currency: TokenTwo.currency, issuer: TokenTwo.issuer }
			: { currency: "XRP" },
		Flags: 1048576, // withdraws both amm assets up to specified amounts. Actual amounts received
		// maintains balance of assets in the amms pool 0x00100000 tfTwoAsset
	};

	return withdraw;
}

export function getCurrency(currency: XrplCurrency) {
	return {
		currency: currency.currency,
		...(currency.issuer && { issuer: currency.issuer }),
	};
}

export function getXrplExplorerUrl(page: "Bridge" | "Swap" | "Pool") {
	return ROOT_NETWORK.LinkedXrpChain === "livenet"
		? (XRPL_NETWORK.ExplorerUrl as string)
		: (XRPL_NETWORK.ExplorerUrl as { Bridge: string; Swap: string; Pool: string })[page];
}
