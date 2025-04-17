import { useManagePool } from "@/libs/context";
import { useTokenSymbols } from "@/libs/hooks";
import { toFixed } from "@/libs/utils";

import { Text } from "./Text";
import { Tokens } from "./Tokens";

export function YourPosition() {
	const poolManagementData = useManagePool();
	const [xSymbol, ySymbol] = useTokenSymbols(poolManagementData.xToken, poolManagementData.yToken);

	if (poolManagementData.position) {
		return (
			<div className="h-[16em] w-full max-w-[30em] rounded-2xl bg-neutral-200 p-8">
				<div className="grid grid-cols-2 gap-4">
					<p className="font-mikrobe col-span-2 text-center text-neutral-700">Your Position</p>

					<div className="flex items-center gap-2">
						<Tokens
							xSymbol={poolManagementData.xToken?.symbol}
							ySymbol={poolManagementData.yToken?.symbol}
						/>
						<Text className="ml-1 truncate">{`${poolManagementData.xToken?.symbol}/${poolManagementData.yToken?.symbol}`}</Text>
					</div>
					<p className="break-words text-right text-neutral-700">
						{poolManagementData.position?.lpBalance.toHuman()}
					</p>

					<Text>Your pool share</Text>
					<p className="text-right text-neutral-700">
						{toFixed(poolManagementData.position?.poolShare.toNumber(), 3)}%
					</p>

					<Text>{xSymbol}</Text>
					<p className="text-right text-neutral-700">
						{poolManagementData.poolBalances &&
							toFixed(poolManagementData.poolBalances.x.balance.toUnit().toNumber(), 4)}
					</p>

					<Text>{ySymbol}</Text>
					<p className="text-right text-neutral-700">
						{poolManagementData.poolBalances &&
							toFixed(poolManagementData.poolBalances?.y.balance.toUnit().toNumber(), 4)}
					</p>
				</div>
			</div>
		);
	} else {
		<></>;
	}
}
