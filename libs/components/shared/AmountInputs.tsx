import classNames from "@sindresorhus/class-names";

import { useTokenSymbols } from "@/libs/hooks";
import type { Token, TokenSource, TrnToken } from "@/libs/types";
import { Balance } from "@/libs/utils";

import { AmountInput, Button, TokenImage } from "./";

interface AmountInputsProps {
	xToken?: Token;
	yToken?: Token;

	setSrc?: (src: "x" | "y") => void;

	xAmount: string;
	yAmount: string;

	xTokenBalance?: Balance<TrnToken> | string;
	yTokenBalance?: Balance<TrnToken> | string;

	xTokenUSD?: number;
	yTokenUSD?: number;

	xTokenError?: string;
	yTokenError?: string;

	singleSidedDeposit?: boolean;

	labels: [string, string];
	plusIcon?: boolean;
	between?: JSX.Element;
	setIsOpen: (token: "xToken" | "yToken") => void;

	setAmount: (args: { src: TokenSource; amount: string }) => void;
}

export function AmountInputs({
	xToken,
	yToken,

	setSrc,

	xAmount,
	yAmount,

	xTokenBalance,
	yTokenBalance,

	xTokenUSD,
	yTokenUSD,

	xTokenError,
	yTokenError,

	singleSidedDeposit = false,

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
				onClick={() => setSrc?.("x")}
				tokenBalance={xTokenBalance}
				tokenUSD={xTokenUSD}
			>
				{xToken && (
					<Button
						variant="secondary"
						size="sm"
						className="text-neutral-700"
						onClick={() => {
							if (setSrc) {
								setSrc("x");
							}
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

			{!singleSidedDeposit &&
				(between
					? between
					: plusIcon && <div className="flex h-6 items-center justify-center text-lg">+</div>)}

			{!singleSidedDeposit && (
				<AmountInput
					token={yToken}
					amount={yAmount}
					label={labels[1]}
					error={yTokenError}
					setAmount={(amount) => setAmount({ src: "y", amount })}
					onClick={() => setSrc?.("y")}
					tokenBalance={yTokenBalance}
					tokenUSD={yTokenUSD}
				>
					{yToken && (
						<Button
							variant="secondary"
							size="sm"
							className="text-neutral-700"
							onClick={() => {
								if (setSrc) {
									setSrc("y");
								}
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
			)}
		</>
	);
}
