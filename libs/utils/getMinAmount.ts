import type { TrnToken } from "../types";
import { Balance } from "./Balance";

export function getMinAmount(amount: Balance<TrnToken>, slippage: string | number) {
	return amount.multipliedBy(1 - +slippage / 100).integerValue();
}
