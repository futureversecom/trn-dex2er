import BigNumber from "bignumber.js";

import { EXCHANGE_RATE, NETWORK_FEE_RATE } from "../constants";

export function getNetworkFee(amount: number): BigNumber {
	return new BigNumber((amount * (EXCHANGE_RATE - NETWORK_FEE_RATE)) / 100);
}

export function getSwapFee(amount: number): BigNumber {
	return new BigNumber(amount * (NETWORK_FEE_RATE / 100));
}
