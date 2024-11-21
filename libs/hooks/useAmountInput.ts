import { useCallback, useEffect, useMemo, useState } from "react";

import { useTrnTokens, useWallets, useXrplCurrencies } from "../context";
import type { Token, TrnToken, XrplBalance } from "../types";
import { Balance, isXrplCurrency } from "../utils";

export function useAmountInput(
	token?: Token,
	poolBalance?: XrplBalance | Balance<TrnToken> | undefined
) {
	const [amount, setAmount] = useState("");
	const [error, setError] = useState<string>();

	const { network } = useWallets();
	const { getTokenBalance } = useTrnTokens();
	const { getBalance } = useXrplCurrencies();

	const limitDecimalsRegExp = useMemo(() => {
		const tokenDecimals = token?.decimals ? (token?.decimals > 0 ? token.decimals : 1) : 6;
		return new RegExp(String.raw`^(?:[1-9]\d*|0)?(?:\.\d{1,${tokenDecimals}}|\.)?`, "g");
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
			const xrplPoolBalance = poolBalance as XrplBalance;
			const balance = xrplPoolBalance ? +xrplPoolBalance : +(getBalance(token)?.value ?? 0);
			isInsufficientBalance = balance < +amount;
		} else {
			const tokenPoolBalance = poolBalance as Balance<TrnToken>;
			const balance = tokenPoolBalance ? tokenPoolBalance : getTokenBalance(token)?.toUnit();
			isInsufficientBalance = balance?.lt(amount) ?? true;
		}

		if (isInsufficientBalance) maybeError = "Insufficient balance";

		setError(maybeError);
	}, [amount, token, getTokenBalance, getBalance, network, poolBalance]);

	return { amount, setAmount: updateAmount, error };
}
