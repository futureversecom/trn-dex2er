import { useCallback, useMemo, useState } from "react";

import { useTrnTokens, useXrplCurrencies } from "@/libs/context";
import { Token, TrnToken, XrplCurrency } from "@/libs/types";
import { isXrplCurrency, toHuman } from "@/libs/utils";

import { Modal, type ModalProps, TableRow, Text, TokenImage } from "./";

interface TokenSelectProps<T extends Token> extends ModalProps {
	tokens: TrnToken[] | XrplCurrency[];
	onTokenClick: (token: T) => void;
}

export function TokenSelect<T extends Token>({
	open,
	onClose,
	tokens,
	onTokenClick,
}: TokenSelectProps<T>) {
	const { getBalance } = useXrplCurrencies();
	const { getTokenBalance } = useTrnTokens();

	const [filter, setFilter] = useState("");

	const isXrpl = tokens.every(isXrplCurrency);

	const filteredTokens = useMemo(() => {
		if (!filter) return tokens;

		if (isXrpl) {
			return tokens.filter(
				(token) => token.ticker || token.currency.toLowerCase().includes(filter.toLowerCase())
			);
		}

		return tokens.filter(
			(token) =>
				String(token.assetId).includes(filter) ||
				token.name.toLowerCase().includes(filter.toLowerCase()) ||
				token.symbol.toLowerCase().includes(filter.toLowerCase())
		);
	}, [filter, tokens, isXrpl]);

	const onRowClick = useCallback(
		(token: T) => {
			onTokenClick(token);
			setFilter("");
			onClose?.();
		},
		[onTokenClick, onClose]
	);

	return (
		<Modal
			open={open}
			onClose={() => {
				onClose?.();
				setFilter("");
			}}
			heading="select a token"
		>
			<div className="relative">
				<label htmlFor="token-input" className="absolute left-3 top-2.5 cursor-pointer">
					<svg width={18} height={18} className="text-neutral-700">
						<use xlinkHref="/images/search.svg#search" />
					</svg>
				</label>
				<input
					id="token-input"
					type="text"
					className="w-full overflow-x-hidden overflow-ellipsis rounded-md bg-neutral-100 px-4 py-2 pl-10 text-sm text-neutral-700"
					placeholder="Search by name, symbol or address"
					onChange={(e) => setFilter(e.target.value)}
				/>
			</div>

			<div className="flex max-h-[20em] flex-col space-y-2 overflow-y-scroll">
				{isXrpl
					? (filteredTokens as XrplCurrency[]).map((token) => {
							const tokenBalance = toHuman(getBalance(token)?.value ?? 0, token);

							return (
								<TableRow
									key={token.currency}
									onClick={onRowClick.bind(null, token as T)}
									items={[
										<TokenImage symbol={token.ticker || token.currency} size={28} key="token" />,
										<div key="symbol">
											<Text>{token.ticker || token.currency}</Text>
											<Text className="!text-neutral-500">{token.ticker || token.currency}</Text>
										</div>,
										<div key="balance" className="flex w-full justify-end">
											<Text>{tokenBalance}</Text>
										</div>,
									]}
								/>
							);
						})
					: (filteredTokens as TrnToken[]).map((token) => {
							const tokenBalance = getTokenBalance(token)?.toHuman() ?? 0;

							return (
								<TableRow
									key={token.assetId}
									onClick={onRowClick.bind(null, token as T)}
									items={[
										<TokenImage symbol={token.symbol} size={28} key="token" />,
										<div key="symbol">
											<Text>{token.symbol}</Text>
											<Text className="!text-neutral-500">{token.name ?? token.symbol}</Text>
										</div>,
										<div key="balance" className="flex w-full justify-end">
											<Text>{tokenBalance}</Text>
										</div>,
									]}
								/>
							);
						})}
			</div>
		</Modal>
	);
}
