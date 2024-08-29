import classNames from "@sindresorhus/class-names";
import { useCallback, useState } from "react";

import { useTokenSymbols } from "@/libs/hooks";
import { Token } from "@/libs/types";
import { toFixed } from "@/libs/utils";

import { Button, Text } from "./";

interface RatioProps {
	xToken: Token;
	yToken: Token;
	ratio: string;
	priceDifference?: number;
	isSwitchable?: boolean;
}

export function Ratio({
	xToken,
	yToken,
	ratio,
	isSwitchable = false,
	priceDifference,
}: RatioProps) {
	const [isSwitched, setIsSwitched] = useState(false);

	const onSwitchClick = useCallback(() => {
		setIsSwitched((prev) => !prev);
	}, []);

	const [xSymbol, ySymbol] = useTokenSymbols(xToken, yToken);

	return (
		<div className="flex items-center gap-4">
			<div>
				<Text size="md" className="!text-neutral-600">
					1 {!isSwitched ? xSymbol : ySymbol} ≈ {!isSwitched ? ratio : toFixed(1 / +ratio, 6)}{" "}
					{!isSwitched ? ySymbol : xSymbol}
				</Text>
				{priceDifference && (
					<Text
						size="md"
						className={classNames(priceDifference < -15 ? "!text-red-300" : "!text-neutral-600")}
					>
						Price difference ≈ {toFixed(priceDifference)}%
					</Text>
				)}
			</div>
			{isSwitchable && (
				<Button variant="tertiary" size="rounded" onClick={onSwitchClick} className="!p-2">
					<svg
						height={16}
						width={16}
						className={classNames(
							"transition duration-200",
							isSwitched ? "-rotate-90" : "rotate-90"
						)}
					>
						<use xlinkHref="/images/commons.svg#switch" />
					</svg>
				</Button>
			)}
		</div>
	);
}
