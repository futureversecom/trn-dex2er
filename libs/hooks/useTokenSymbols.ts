import { useMemo } from "react";

import type { Token } from "../types";
import { isXrplCurrency } from "../utils";

export function useTokenSymbols(
	xToken?: Token,
	yToken?: Token
): [string | undefined, string | undefined] {
	const xSymbol = useMemo(
		() => (isXrplCurrency(xToken) ? xToken.ticker || xToken.currency : xToken?.symbol),
		[xToken]
	);

	const ySymbol = useMemo(
		() => (isXrplCurrency(yToken) ? yToken.ticker || yToken.currency : yToken?.symbol),
		[yToken]
	);

	return [xSymbol, ySymbol];
}
