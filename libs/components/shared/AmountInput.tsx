import classNames from "@sindresorhus/class-names";
import { type PropsWithChildren } from "react";

import type { Token, TrnToken } from "@/libs/types";
import { Balance, toHuman } from "@/libs/utils";

import { Text } from "./";

interface AmountInputProps extends PropsWithChildren {
	amount: string;
	setAmount: (amount: string) => void;
	label?: string;
	token?: Token;
	tokenBalance?: Balance<TrnToken> | string;
	error?: string;
	tokenUSD?: number;
	onClick?: () => void;
}

export function AmountInput({
	amount,
	setAmount,
	label,
	tokenBalance,
	token,
	error,
	tokenUSD,
	onClick,
	children,
}: AmountInputProps) {
	return (
		<div className="flex space-x-4">
			<div className="flex h-28 w-full min-w-[50em] flex-col justify-center space-y-2 rounded bg-neutral-400 px-6">
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
						onClick={() => (onClick ? onClick() : {})}
						className="bg-transparent text-xl font-semibold focus:outline-none"
					/>
					<Text
						className={classNames(
							"absolute -bottom-2 left-0 text-neutral-500",
							error && "text-red-300"
						)}
					>
						{error ? error : tokenUSD ? `$${tokenUSD.toFixed(2)}` : ""}
					</Text>
					<span className="flex gap-2">{children}</span>
				</span>
			</div>
		</div>
	);
}
