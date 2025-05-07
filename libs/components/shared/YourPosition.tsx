import { useManagePool } from "@/libs/context";
import { useTokenSymbols } from "@/libs/hooks";
import { toFixed } from "@/libs/utils";

import { Text } from "./Text";
import { Tokens } from "./Tokens";

const Skeleton = ({ className = "" }) => (
	<div className={`animate-pulse rounded bg-neutral-700/50 ${className}`} />
);

export function YourPosition() {
	const poolManagementData = useManagePool();
	const [xSymbol, ySymbol] = useTokenSymbols(poolManagementData.xToken, poolManagementData.yToken);

	return (
		<div className="h-[16em] w-full max-w-[30em] rounded-2xl bg-neutral-200 p-8">
			<div className="grid grid-cols-2 gap-4">
				<p className="font-mikrobe col-span-2 text-center text-neutral-700">Your Position</p>

				{poolManagementData.isLoadingPools ? (
					<>
						<div className="flex items-center gap-2">
							<Skeleton className="h-8 w-16 rounded-full" />
						</div>
						<Skeleton className="ml-auto h-6 w-24" />

						<Text>Your pool share</Text>
						<Skeleton className="ml-auto h-6 w-16" />

						<Text>{xSymbol || "Token 1"}</Text>
						<Skeleton className="ml-auto h-6 w-20" />

						<Text>{ySymbol || "Token 2"}</Text>
						<Skeleton className="ml-auto h-6 w-20" />
					</>
				) : (
					<>
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
						{poolManagementData.position && poolManagementData.position.poolShare ? (
							<p className="text-right text-neutral-700">
								{toFixed(poolManagementData.position.poolShare.toNumber(), 3)}%
							</p>
						) : (
							<Skeleton className="ml-auto h-6 w-16" />
						)}

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
					</>
				)}
			</div>
		</div>
	);
}
