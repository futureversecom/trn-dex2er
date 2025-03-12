import classNames from "@sindresorhus/class-names";
import { type PropsWithChildren } from "react";

import type { Token, TrnToken } from "@/libs/types";
import { Balance, toHuman } from "@/libs/utils";
import { toDollarValue } from "@/libs/utils";

import { Text } from "./";

interface AmountInputProps extends PropsWithChildren {
	onFocus?: () => void;
	setAmount: (amount: string) => void;

	token?: Token;
	amount: string;
	label?: string;
	error?: string;
	active?: boolean;
	tokenUSD?: number;
	tokenBalance?: Balance<TrnToken> | string;
}

export function AmountInput({
	label,
	token,
	error,
	amount,
	active,
	onFocus,
	tokenUSD,
	children,
	setAmount,
	tokenBalance,
}: AmountInputProps) {
	return (
		<div className="flex w-full">
			<div
				className={classNames(
					"flex h-28 w-full flex-col justify-center space-y-2 rounded px-6",
					active ? "border border-primary-700" : ""
				)}
			>
				<span className="flex items-center justify-between text-sm">
					{label && (
						<label htmlFor={`amount-${label}`} className="cursor-pointer text-neutral-700">
							{label}
						</label>
					)}
					{token && tokenBalance && (
						<p className="text-neutral-500">Balance: {toHuman(tokenBalance.toString(), token)}</p>
					)}
				</span>

				<span
					className={classNames(
						"relative flex w-full items-center justify-between",
						(error || token?.priceInUSD) && "pb-2"
					)}
				>
					<input
						type="text"
						value={amount}
						placeholder="0.0"
						id={`amount-${label}`}
						onChange={(e) => setAmount(e.target.value)}
						onFocus={() => onFocus?.()}
						className="bg-transparent text-xl font-semibold text-neutral-700 focus:outline-none"
					/>
					<Text
						className={classNames(
							"absolute -bottom-2 left-0 text-neutral-500",
							error && "text-red-300"
						)}
					>
						{error ? error : tokenUSD ? `$${toDollarValue(+tokenUSD?.toFixed(2))}` : ""}
					</Text>
					<span className="flex gap-2">{children}</span>
				</span>
			</div>
		</div>
	);
}
