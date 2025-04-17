import { usePagination } from "react-use-pagination";

import { Box, LPTokens, Pagination, TableRow, Text } from "@/libs/components/shared";
import { useManagePool, useWallets } from "@/libs/context";
import { toFixed } from "@/libs/utils";

// Create a skeleton component if you don't have one already
const Skeleton = ({ className = "" }) => (
	<div className={`animate-pulse rounded bg-neutral-700/50 ${className}`} />
);

export function Positions() {
	const { isConnected } = useWallets();
	const { onPoolClick, positions, isFetchingPools } = useManagePool();
	// const debouncedIsFetching = useDebouncedValue(isFetchingPools, 200);

	const { startIndex, endIndex, ...paginationProps } = usePagination({
		totalItems: positions?.length ?? 0,
		initialPageSize: 10,
	});

	// Helper function to render skeleton rows
	const renderSkeletons = () => {
		return Array.from({ length: 3 }).map((_, index) => (
			<TableRow
				key={`skeleton-${index}`}
				className="[&>div]:flex [&>div]:min-w-[12em] [&>div]:flex-col [&>div]:items-center"
				items={[
					<div key="tokens" className="flex items-center gap-1">
						<Skeleton className="-ml-2 h-6 w-6 rounded-full" />
					</div>,
					<div className="space-y-2" key="position">
						<Skeleton className="h-5 w-20" />
						<Skeleton className="h-4 w-16" />
					</div>,
					<div className="space-y-2" key="share">
						<Skeleton className="h-5 w-16" />
						<Skeleton className="h-4 w-16" />
					</div>,
				]}
			/>
		));
	};

	return (
		<Box
			heading="manage positions"
			className="relative flex min-h-[350px] flex-col"
			// Remove isLoading prop to handle loading state manually
		>
			<div className="flex-grow">
				{isFetchingPools && (!positions || positions.length === 0) ? (
					// Show skeletons during initial load
					renderSkeletons()
				) : positions && positions.length > 0 ? (
					// Show actual positions when available
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
					</>
				) : (
					// Empty state
					<div className="flex h-[200px] items-center justify-center">
						<Text className="text-center">
							{!isConnected ? "Connect wallet to continue" : "No positions found"}
						</Text>
					</div>
				)}
			</div>

			{/* Only show pagination when we have positions */}
			{positions && positions.length > 0 && (
				<div className="mt-auto pt-4">
					<Pagination {...paginationProps} />
				</div>
			)}
		</Box>
	);
}
