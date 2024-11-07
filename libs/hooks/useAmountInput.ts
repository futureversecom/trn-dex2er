import { useCallback, useEffect, useMemo, useState } from "react";

import { useTrnTokens, useWallets, useXrplCurrencies } from "../context";
import type { Token } from "../types";
import { isXrplCurrency } from "../utils";

export function useAmountInput(token?: Token) {
	const [amount, setAmount] = useState("");
	const [error, setError] = useState<string>();

	const { network } = useWallets();
	const { getTokenBalance } = useTrnTokens();
	const { getBalance } = useXrplCurrencies();

	const limitDecimalsRegExp = useMemo(() => {
		return new RegExp(
			String.raw`^(?:[1-9]\d*|0)?(?:\.\d{1,${token?.decimals ? (token?.decimals > 0 ? token.decimals : 1) : 6}}|\.)?`,
			"g"
		);
	}, [token?.decimals]);

	const updateAmount = useCallback(
		(amount: string) => {
			if (amount === ".") return setAmount("0.");

			const match = amount.match(limitDecimalsRegExp);
			if (!match?.length) return;

			setAmount(match[0]);
		},
		[limitDecimalsRegExp, setAmount]
	);

	useEffect(() => {
		if (!amount || !token) return setError(undefined);

		let maybeError: string | undefined;
		let isInsufficientBalance = false;

		if (isXrplCurrency(token)) {
			const balance = +(getBalance(token)?.value ?? 0);
			isInsufficientBalance = balance < +amount;
		} else {
			const balance = getTokenBalance(token)?.toUnit();
			isInsufficientBalance = balance?.lt(amount) ?? true;
		}

		if (isInsufficientBalance) maybeError = "Insufficient balance";

		setError(maybeError);
	}, [amount, token, getTokenBalance, getBalance, network]);

	return { amount, setAmount: updateAmount, error };
}
