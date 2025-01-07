import { usePathname } from "next/navigation";
import { type Dispatch, type SetStateAction, useCallback, useMemo, useState } from "react";

import { useTrnTokens } from "../context";
import type { IsTokenOpen, TokenSource, TrnToken } from "../types";
import { type Balance } from "../utils";
import { useAmountInput } from "./useAmountInput";

export interface TrnTokenInputs {
	xAmount: string;
	setXAmount: (amount: string) => void;
	xToken?: TrnToken;
	xTokenBalance?: Balance<TrnToken>;
	xTokenError?: string;
	xTokenUSD?: number;

	yAmount: string;
	setYAmount: (amount: string) => void;
	yToken?: TrnToken;
	yTokenBalance?: Balance<TrnToken>;
	yTokenError?: string;
	yTokenUSD?: number;

	priceDifference?: number;

	isOpen: IsTokenOpen;
	setIsOpen: Dispatch<SetStateAction<IsTokenOpen>>;
	filteredTokens: Record<string, TrnToken>;
	onTokenClick: (token: TrnToken) => void;

	isDisabled: boolean;

	refetchTokenBalances: () => void;
}

export type TrnTokenInputState = Pick<TrnTokenInputs, "xToken" | "yToken">;

export function useTrnTokenInputs<T extends TrnTokenInputState>(
	state: T,
	setToken: (props: { src: TokenSource; token: TrnToken }) => void,
	poolBalances?:
		| {
				x: {
					balance: Balance<TrnToken>;
					liquidity: Balance<TrnToken>;
				};
				y: {
					balance: Balance<TrnToken>;
					liquidity: Balance<TrnToken>;
				};
		  }
		| undefined
) {
	const pathname = usePathname();
	const { tokens, getTokenBalance, refetchTokenBalances } = useTrnTokens();

	const [isOpen, setIsOpen] = useState<IsTokenOpen>(false);

	const {
		amount: xAmount,
		setAmount: setXAmount,
		error: xTokenError,
	} = useAmountInput(state.xToken, poolBalances?.x?.balance ?? undefined);

	const {
		amount: yAmount,
		setAmount: setYAmount,
		error: yTokenBalanceError,
	} = useAmountInput(state.yToken, poolBalances?.y?.balance ?? undefined);

	// 'yToken' doesn't need a balance to be swapped to
	const yTokenError = useMemo(() => {
		if (!pathname.includes("swap") && yTokenBalanceError) return yTokenBalanceError;
	}, [pathname, yTokenBalanceError]);

	const xTokenBalance = useMemo(
		() => getTokenBalance(state.xToken)?.toUnit(),
		[getTokenBalance, state.xToken]
	);

	const yTokenBalance = useMemo(
		() => getTokenBalance(state.yToken)?.toUnit(),
		[getTokenBalance, state.yToken]
	);

	const filterTokens = useCallback(
		({
			xToken,
			yToken,
			isOpen,
		}: {
			xToken?: TrnToken;
			yToken?: TrnToken;
			isOpen: "xToken" | "yToken" | false;
		}) => {
			return Object.entries(tokens ?? {}).filter(
				([_, token]) =>
					!token.symbol.startsWith("LP") &&
					token.symbol !== (isOpen === "xToken" ? xToken?.symbol : yToken?.symbol) &&
					(xToken && !yToken ? token.symbol !== xToken.symbol : true) &&
					(yToken && !xToken ? token.symbol !== yToken.symbol : true)
			);
		},
		[tokens]
	);

	const filteredTokens = useMemo(() => {
		return Object.fromEntries(filterTokens({ ...state, isOpen }));
	}, [state, isOpen, filterTokens]);

	const onTokenClick = useCallback(
		(token: TrnToken) => {
			const { xToken, yToken } = state;

			if (isOpen === "xToken") {
				setToken({ src: "x", token });
				setXAmount("");
				if (xToken && yToken && token.symbol === yToken.symbol) {
					setToken({ src: "y", token: xToken });
					const x = xAmount;
					setXAmount(yAmount);
					setYAmount(x);
				}
			}

			if (isOpen === "yToken") {
				setToken({ src: "y", token });
				setYAmount("");
				if (xToken && yToken && token.symbol === xToken.symbol) {
					setToken({ src: "x", token: yToken });
					const y = yAmount;
					setYAmount(xAmount);
					setXAmount(y);
				}
			}

			setIsOpen(false);
		},
		[isOpen, setToken, setXAmount, setYAmount, state, xAmount, yAmount]
	);

	const isDisabled = useMemo(() => {
		if (!state.xToken || !state.yToken) return true;

		if (!xAmount || !yAmount) return true;

		if (xTokenError || yTokenError) return true;

		return false;
	}, [state, xAmount, yAmount, xTokenError, yTokenError]);

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
