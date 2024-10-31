import type { Token } from "../types";
import { Balance } from "./Balance";
import { isXrplCurrency } from "./isXrplCurrency";

export function toHuman(amount: string | number, token: Token) {
	const decimals = isXrplCurrency(token)
		? {
				decimals: token.decimals ?? 6,
			}
		: token;

	return new Balance(amount, decimals, false).toHuman();
}
