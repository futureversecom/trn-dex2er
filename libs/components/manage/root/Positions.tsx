import { usePagination } from "react-use-pagination";

import { Box, LPTokens, Pagination, TableRow, Text } from "@/libs/components/shared";
import { useManagePool, useWallets } from "@/libs/context";
import { useDebouncedValue } from "@/libs/hooks";
import { toFixed } from "@/libs/utils";

export function Positions() {
	const { isConnected } = useWallets();
	const { onPoolClick, positions, isFetchingPools } = useManagePool();
	const deBouncedIsFetching = useDebouncedValue(isFetchingPools, 200);

	const { startIndex, endIndex, ...paginationProps } = usePagination({
		totalItems: positions?.length ?? 0,
		initialPageSize: 10,
	});

	return (
		<Box heading="manage positions" className="relative" isLoading={isFetchingPools}>
			{positions?.length > 0 ? (
				<>
					{positions.slice(startIndex, endIndex + 1).map((pool) => (
						<TableRow
							key={pool.assetId}
							onClick={onPoolClick.bind(null, pool.xToken, pool.yToken)}
							className="[&>div]:flex [&>div]:min-w-[12em] [&>div]:flex-col [&>div]:items-center"
							items={[
								<LPTokens tokens={[pool.xToken.symbol, pool.yToken.symbol]} key="LP Tokens" />,
								<div className="space-y-2" key="position">
									<Text>{pool.lpBalance.toHuman()}</Text>
									<Text className="!text-neutral-500">Position</Text>
								</div>,
								<div className="space-y-2" key="share">
									<Text>{toFixed(pool.poolShare.toNumber(), 3)}%</Text>
									<Text className="!text-neutral-500">Pool Share</Text>
								</div>,
							]}
						/>
					))}

					<Pagination {...paginationProps} />
				</>
			) : (
				<Text>
					{!isConnected
						? "Connect wallet to continue"
						: deBouncedIsFetching
							? "Fetching positions"
							: "No positions found"}
				</Text>
			)}
		</Box>
	);
}
