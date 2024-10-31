import { Value } from "@sinclair/typebox/value";

import { XrplCurrency } from "../types";

export function isXrplCurrency(token: any): token is XrplCurrency {
	return Value.Check(XrplCurrency, token);
}
