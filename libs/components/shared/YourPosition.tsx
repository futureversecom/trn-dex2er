import { useManagePool } from "@/libs/context";
import { useTrnTokens } from "@/libs/context";
import { useTokenSymbols } from "@/libs/hooks";
import { toHuman } from "@/libs/utils";
import { toFixed } from "@/libs/utils";

import { Text } from "./Text";
import { Tokens } from "./Tokens";

export function YourPosition() {
	const { position } = useTrnTokens();
	const props = useManagePool();
	const [xSymbol, ySymbol] = useTokenSymbols(props.xToken, props.yToken);

	const currentPosition = position.find(
		(p) => p.xToken === props.xToken && p.yToken === props.yToken
	);

	const balanceX =
		props.xToken && toHuman(props.poolBalances?.x.balance.toUnit().toString() ?? 0, props.xToken);
	const balanceY =
		props.yToken && toHuman(props.poolBalances?.y.balance.toUnit().toString() ?? 0, props.yToken);

	return (
		<div className="h-[16em] w-[25em] rounded-2xl bg-neutral-200 p-8">
			<div className="grid grid-cols-2 gap-4">
				<p className="font-mikrobe col-span-2 text-center">Your Position</p>

				<div className="flex items-center">
					<Tokens xSymbol={props.xToken?.symbol} ySymbol={props.yToken?.symbol} />
					<Text>{`${props.xToken?.symbol}/${props.yToken?.symbol}`}</Text>
				</div>

				<p className="break-words text-right">{currentPosition?.lpBalance.toHuman()}</p>

				<Text>Your pool share</Text>
				<p className="text-right">
					{currentPosition && toFixed(currentPosition?.poolShare.toNumber(), 3)}%
				</p>

				<Text>{xSymbol}</Text>
				<p className="text-right">
					{balanceX && (+balanceX < 1 ? toFixed(+balanceX, 4) : balanceX)}
				</p>

				<Text>{ySymbol}</Text>
				<p className="text-right">
					{balanceY && (+balanceY < 1 ? toFixed(+balanceY, 4) : balanceY)}
				</p>
			</div>
		</div>
	);
}
