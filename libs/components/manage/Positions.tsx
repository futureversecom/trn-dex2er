import type { BigNumber } from "bignumber.js";
import { useMemo } from "react";
import { usePagination } from "react-use-pagination";

import { LPTokens, Pagination, TableRow, Text } from "@/libs/components/shared";
import { useManagePool, useTrnTokens } from "@/libs/context";
import type { TrnToken, TrnTokens } from "@/libs/types";
import { type Balance, toFixed } from "@/libs/utils";

interface Position {
	assetId: number;
	xToken: TrnToken;
	yToken: TrnToken;
	lpBalance: Balance<TrnToken>;
	poolShare: BigNumber;
}

export function Positions() {
	const { onPoolClick } = useManagePool();
	const { pools, tokens, getTokenBalance } = useTrnTokens();

	const positions = useMemo(() => {
		if (!pools || !tokens) return null;

		return pools
			.sort((a, b) => (a.assetId > b.assetId ? 1 : -1))
			.map((pool) => {
				const lpToken = findToken(pool.assetId, tokens);
				const lpBalance = getTokenBalance(lpToken);

				if (!lpToken || !lpBalance || lpBalance.eq(0)) return null;

				const [xAssetId, yAssetId] = pool.poolKey.split("-").map(Number);
				const xToken = findToken(xAssetId, tokens);
				const yToken = findToken(yAssetId, tokens);

				if (!xToken || !yToken) return null;

				const poolShare = lpBalance.div(lpToken.supply).multipliedBy(100);

				return {
					assetId: pool.assetId,
					xToken,
					yToken,
					lpBalance,
					poolShare,
				};
			})
			.filter((pool): pool is Position => !!pool);
	}, [pools, tokens, getTokenBalance]);

	const { startIndex, endIndex, ...paginationProps } = usePagination({
		totalItems: positions?.length ?? 0,
		initialPageSize: 5,
	});

	if (!positions?.length) return null;

	return (
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
	);
}

function findToken(assetId: number, tokens: TrnTokens): TrnToken | undefined {
	return Object.values(tokens).find((token) => token.assetId === assetId);
}
