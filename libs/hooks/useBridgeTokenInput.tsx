import { useMemo, useState } from "react";

import { ROOT_NETWORK, XRPL_BRIDGE_TOKENS } from "../constants";
import { useTrnTokens, useXrplCurrencies } from "../context";
import { Token, TrnToken, TrnTokens, XrplCurrency } from "../types";
import { Balance, isXrplCurrency } from "../utils";
import { useAmountInput } from "./useAmountInput";

export type BridgeTokenInput = {
	amount: string;
	setAmount: (amount: string) => void;
	tokenError?: string;
	tokenBalance?: Balance<TrnToken> | string;
	tokenUSD?: number;

	token: Token | undefined;
	setToken: (token: Token) => void;

	isOpen: boolean;
	setIsOpen: (isOpen: boolean) => void;

	filteredTokens: TrnTokens | XrplCurrency[];
	isDisabled: boolean;
};

export function useBridgeTokenInput(): BridgeTokenInput {
	const { tokens, getTokenBalance } = useTrnTokens();
	const { currencies, getBalance } = useXrplCurrencies();

	const [token, setToken] = useState<Token>();
	const [isOpen, setIsOpen] = useState(false);

	const { amount, setAmount, error: tokenError } = useAmountInput(token);

	const filteredTokens = useMemo(() => {
		if (isXrplCurrency(token))
			return currencies.filter(
				(c) => XRPL_BRIDGE_TOKENS.includes(c.ticker || c.currency) && c.currency !== token?.currency
			);

		return Object.values(tokens).reduce<TrnTokens>((acc, t: TrnToken) => {
			if (ROOT_NETWORK.NetworkName !== "root" && t.assetId === 203876) return acc; // Duplicate ZRP token

			if (XRPL_BRIDGE_TOKENS.includes(t.symbol) && t.symbol !== token?.symbol) {
				acc[t.assetId] = t;
			}

			return acc;
		}, {});
	}, [token, tokens, currencies]);

	const isDisabled = useMemo(() => {
		if (!token) return true;

		if (!amount) return true;

		if (tokenError) return true;

		return false;
	}, [token, amount, tokenError]);

	const tokenBalance = useMemo(() => {
		if (isXrplCurrency(token)) return getBalance(token)?.value;

		return getTokenBalance(token);
	}, [token, getBalance, getTokenBalance]);

	const tokenUSD = useMemo(() => {
		if (!amount || !token?.priceInUSD) return;

		return token.priceInUSD * +amount;
	}, [amount, token?.priceInUSD]);

	return {
		amount,
		setAmount,
		tokenError,
		tokenBalance,
		tokenUSD,

		token,
		setToken,

		isOpen,
		setIsOpen,

		filteredTokens,

		isDisabled,
	};
}
