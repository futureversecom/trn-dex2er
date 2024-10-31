import classNames from "@sindresorhus/class-names";

import { useTokenSymbols } from "@/libs/hooks";
import type { Token, TokenSource, TrnToken } from "@/libs/types";
import { Balance } from "@/libs/utils";

import { AmountInput, Button, TokenImage } from "./";

interface AmountInputsProps {
	xToken?: Token;
	yToken?: Token;

	xAmount: string;
	yAmount: string;

	xTokenBalance?: Balance<TrnToken> | string;
	yTokenBalance?: Balance<TrnToken> | string;

	xTokenUSD?: number;
	yTokenUSD?: number;

	xTokenError?: string;
	yTokenError?: string;

	labels: [string, string];
	plusIcon?: boolean;
	between?: JSX.Element;
	setIsOpen: (token: "xToken" | "yToken") => void;

	setAmount: (args: { src: TokenSource; amount: string }) => void;
}

export function AmountInputs({
	xToken,
	yToken,

	xAmount,
	yAmount,

	xTokenBalance,
	yTokenBalance,

	xTokenUSD,
	yTokenUSD,

	xTokenError,
	yTokenError,

	labels,
	plusIcon,
	between,
	setIsOpen,

	setAmount,
}: AmountInputsProps) {
	const [xSymbol, ySymbol] = useTokenSymbols(xToken, yToken);

	return (
		<>
			<AmountInput
				token={xToken}
				amount={xAmount}
				label={labels[0]}
				error={xTokenError}
				setAmount={(amount) => setAmount({ src: "x", amount })}
				tokenBalance={xTokenBalance}
				tokenUSD={xTokenUSD}
			>
				{xToken && (
					<Button
						variant="secondary"
						size="sm"
						className="text-neutral-700"
						onClick={() => {
							if (!xTokenBalance)
								return setAmount({
									src: "x",
									amount: "",
								});

							setAmount({
								src: "x",
								amount: xTokenBalance.toString(),
							});
						}}
					>
						max
					</Button>
				)}
				<Button
					chevron
					size="sm"
					onClick={() => setIsOpen("xToken")}
					variant={xToken ? "secondary" : "primary"}
					className={classNames(xToken && "text-neutral-700")}
					icon={xSymbol ? <TokenImage symbol={xSymbol} /> : undefined}
				>
					{xSymbol ? xSymbol : "select token"}
				</Button>
			</AmountInput>

			{between
				? between
				: plusIcon && <div className="flex h-6 items-center justify-center text-lg">+</div>}

			<AmountInput
				token={yToken}
				amount={yAmount}
				label={labels[1]}
				error={yTokenError}
				setAmount={(amount) => setAmount({ src: "y", amount })}
				tokenBalance={yTokenBalance}
				tokenUSD={yTokenUSD}
			>
				{yToken && (
					<Button
						variant="secondary"
						size="sm"
						className="text-neutral-700"
						onClick={() => {
							if (!yTokenBalance) return setAmount({ src: "y", amount: "" });

							setAmount({
								src: "y",
								amount: yTokenBalance.toString(),
							});
						}}
					>
						max
					</Button>
				)}
				<Button
					chevron
					size="sm"
					onClick={() => setIsOpen("yToken")}
					variant={yToken ? "secondary" : "primary"}
					className={classNames(yToken && "text-neutral-700")}
					icon={ySymbol ? <TokenImage symbol={ySymbol} /> : undefined}
				>
					{ySymbol ? ySymbol : "select token"}
				</Button>
			</AmountInput>
		</>
	);
}
