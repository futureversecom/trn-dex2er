import { type AMMInfoRequest, type Amount, dropsToXrp, type Payment, xrpToDrops } from "xrpl";
import { isIssuedCurrency } from "xrpl/dist/npm/models/transactions/common";

import type { XrplCurrency } from "@/libs/types";
import type { IXrplWalletProvider } from "@/libs/utils";

import { ROOT_NETWORK, XRPL_NETWORK } from "../constants";

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
		let estimatedFromAmount = toAmount / ratio;

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
	console.log("currency", currency, amount);
	if (currency === "XRP") {
		if (amount.includes(".")) {
			const integer = Number(dropsToXrp(amount.split(".")[0]));
			return `${integer}`;
		}
		return Number(dropsToXrp(amount)).toFixed(6);
	}
	return Number(amount).toFixed(8);
}

export function buildTx(
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

export function getCurrency(currency: XrplCurrency) {
	return {
		currency: currency.currency,
		...(currency.issuer && { issuer: currency.issuer }),
	};
}

export function getXrplExplorerUrl(page: "Bridge" | "Swap") {
	return ROOT_NETWORK.LinkedXrpChain === "livenet"
		? (XRPL_NETWORK.ExplorerUrl as string)
		: (XRPL_NETWORK.ExplorerUrl as { Bridge: string; Swap: string })[page];
}
