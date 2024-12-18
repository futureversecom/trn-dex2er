import { usePagination } from "react-use-pagination";

import { LPTokens, Pagination, TableRow, Text } from "@/libs/components/shared";
import { useManageXrplPool, useXrplCurrencies } from "@/libs/context";
import { normalizeCurrencyCode, toFixed } from "@/libs/utils";

export function XrplPositions() {
	const { onPoolClick } = useManageXrplPool();
	const { positions } = useXrplCurrencies();

	const { startIndex, endIndex, ...paginationProps } = usePagination({
		totalItems: positions?.length ?? 0,
		initialPageSize: 10,
	});

	return (
		<>
			{positions.slice(startIndex, endIndex + 1).map((pool) => {
				return (
					<TableRow
						key={pool.currency}
						onClick={onPoolClick.bind(null, pool.xToken, pool.yToken)}
						className="[&>div]:flex [&>div]:min-w-[12em] [&>div]:flex-col [&>div]:items-center"
						items={[
							<LPTokens
								tokens={[
									pool.xToken.ticker || normalizeCurrencyCode(pool.xToken.currency),
									pool.yToken.ticker || normalizeCurrencyCode(pool.yToken.currency),
								]}
								key="LP Tokens"
							/>,
							<div className="space-y-2" key="position">
								<Text>{pool.lpBalance ? pool.lpBalance.value : 0}</Text>
								<Text className="!text-neutral-500">Position</Text>
							</div>,
							<div className="space-y-2" key="share">
								<Text>{pool.poolShare ? toFixed(pool.poolShare.toNumber(), 3) : 0}%</Text>
								<Text className="!text-neutral-500">Pool Share</Text>
							</div>,
						]}
					/>
				);
			})}

			<Pagination {...paginationProps} />
		</>
	);
}
