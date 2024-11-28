import { usePagination } from "react-use-pagination";

import { LPTokens, Pagination, TableRow, Text } from "@/libs/components/shared";
import { useManagePool, useTrnTokens } from "@/libs/context";
import { toFixed } from "@/libs/utils";

export function Positions() {
	const { position } = useTrnTokens();
	const { onPoolClick } = useManagePool();

	const { startIndex, endIndex, ...paginationProps } = usePagination({
		totalItems: position?.length ?? 0,
		initialPageSize: 5,
	});

	if (!position?.length) return null;

	return (
		<>
			{position.slice(startIndex, endIndex + 1).map((pool) => (
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
	);
}
