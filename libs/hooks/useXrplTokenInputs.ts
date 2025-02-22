import { usePathname } from "next/navigation";
import { type Dispatch, type SetStateAction, useCallback, useMemo, useState } from "react";
import { Balance } from "xrpl";

import { useXrplCurrencies } from "../context";
import type { IsTokenOpen, TokenSource, XrplCurrency } from "../types";
import { useAmountInput } from "./useAmountInput";

export interface XrplTokenInputs {
	xAmount: string;
	setXAmount: (amount: string) => void;
	xToken?: XrplCurrency;
	xTokenBalance?: string;
	xTokenError?: string;
	xTokenUSD?: number;

	yAmount: string;
	setYAmount: (amount: string) => void;
	yToken?: XrplCurrency;
	yTokenBalance?: string;
	yTokenError?: string;
	yTokenUSD?: number;

	priceDifference?: number;

	isOpen: IsTokenOpen;
	setIsOpen: Dispatch<SetStateAction<IsTokenOpen>>;
	filteredTokens: XrplCurrency[];
	onTokenClick: (token: XrplCurrency) => void;

	isDisabled: boolean;

	refetchTokenBalances: () => void;
}

export type XrplTokenInputState = Pick<XrplTokenInputs, "xToken" | "yToken">;

export function useXrplTokenInputs<T extends XrplTokenInputState>(
	state: T,
	setToken: (props: { src: TokenSource; token: XrplCurrency }) => void,
	poolBalances?:
		| {
				x: Balance;
				y: Balance;
		  }
		| undefined,
	singleSidedDeposit: boolean = false
): XrplTokenInputs {
	const pathname = usePathname();
	const { currencies, getBalance, refetch: refetchTokenBalances } = useXrplCurrencies();

	const [isOpen, setIsOpen] = useState<IsTokenOpen>(false);

	const {
		amount: xAmount,
		setAmount: setXAmount,
		error: xTokenError,
	} = useAmountInput(state.xToken, poolBalances?.x ?? undefined);

	const {
		amount: yAmount,
		setAmount: setYAmount,
		error: yTokenBalanceError,
	} = useAmountInput(state.yToken, poolBalances?.y ?? undefined);

	// 'yToken' doesn't need a balance to be swapped to
	const yTokenError = useMemo(() => {
		if (!pathname.includes("swap") && yTokenBalanceError) return yTokenBalanceError;
	}, [pathname, yTokenBalanceError]);

	const xTokenBalance = useMemo(() => getBalance(state.xToken)?.value, [getBalance, state.xToken]);

	const yTokenBalance = useMemo(() => getBalance(state.yToken)?.value, [getBalance, state.yToken]);

	const filterTokens = useCallback(
		({
			xToken,
			yToken,
			isOpen,
		}: {
			xToken?: XrplCurrency;
			yToken?: XrplCurrency;
			isOpen: IsTokenOpen;
		}) => {
			return currencies.filter(
				(token) =>
					token.currency !== (isOpen === "xToken" ? xToken?.currency : yToken?.currency) &&
					(xToken && !yToken ? token.currency !== xToken.currency : true) &&
					(yToken && !xToken ? token.currency !== yToken.currency : true)
			);
		},
		[currencies]
	);

	const filteredTokens = useMemo(() => {
		return filterTokens({ ...state, isOpen });
	}, [state, isOpen, filterTokens]);

	const onTokenClick = useCallback(
		(token: XrplCurrency) => {
			const { xToken, yToken } = state;

			if (isOpen === "xToken") {
				setToken({ src: "x", token });
				if (xToken && yToken && token.currency === yToken.currency)
					setToken({ src: "y", token: xToken });
			}

			if (isOpen === "yToken") {
				setToken({ src: "y", token });
				if (xToken && yToken && token.currency === xToken.currency)
					setToken({ src: "x", token: yToken });
			}

			setIsOpen(false);
		},
		[isOpen, setToken, state]
	);

	const isDisabled = useMemo(() => {
		if (!state.xToken || !state.yToken) return true;

		if (!xAmount || (!singleSidedDeposit && !yAmount)) {
			return true;
		}

		if (xTokenError || (yTokenError && !singleSidedDeposit)) return true;

		return false;
	}, [state, xAmount, yAmount, xTokenError, yTokenError, singleSidedDeposit]);

	const xTokenUSD = useMemo(() => {
		if (!xAmount || !state.xToken?.priceInUSD) return;

		return state.xToken.priceInUSD * +xAmount;
	}, [xAmount, state.xToken]);

	const yTokenUSD = useMemo(() => {
		if (!yAmount || !state.yToken?.priceInUSD) return;

		return state.yToken.priceInUSD * +yAmount;
	}, [yAmount, state.yToken]);

	const priceDifference = useMemo(() => {
		if (!xTokenUSD || !yTokenUSD) return;

		return ((yTokenUSD - xTokenUSD) / xTokenUSD) * 100;
	}, [xTokenUSD, yTokenUSD]);

	return {
		isOpen,
		setIsOpen,

		xAmount,
		setXAmount,
		xToken: state.xToken,
		xTokenBalance,
		xTokenError,
		xTokenUSD,

		yAmount,
		setYAmount,
		yToken: state.yToken,
		yTokenBalance,
		yTokenError,
		yTokenUSD,

		priceDifference,

		filteredTokens,
		onTokenClick,

		isDisabled,

		refetchTokenBalances,
	};
}
