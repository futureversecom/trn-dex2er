import { useMemo } from "react";
import { usePagination } from "react-use-pagination";

import { useTrnTokens } from "@/libs/context";
import type { TrnToken } from "@/libs/types";
import { Balance } from "@/libs/utils";

import { LPTokens, Pagination, TableRow, Text } from "../../shared";
import { Liquidity } from "./Liquidity";
import { TokenBalance } from "./TokenBalance";

export function Pools() {
	const { pools, tokens } = useTrnTokens();

	const validPools = useMemo(() => {
		return pools
			.filter((pool) => {
				const [asset1, asset2] = pool.poolKey.split("-");

				const token1 = tokens[+asset1];
				const token2 = tokens[+asset2];

				return (
					token1 &&
					token2 &&
					new Balance(pool.liquidity[0], token1).gt(0) &&
					new Balance(pool.liquidity[1], token1).gt(0)
				);
			})
			.sort(({ assetId: a }, { assetId: b }) => (a > b ? 1 : -1));
	}, [pools, tokens]);

	const { startIndex, endIndex, ...paginationProps } = usePagination({
		totalItems: validPools.length,
		initialPageSize: 5,
	});

	return (
		<>
			<Text>To add liquidity, select a pool below.</Text>

			{!!validPools?.length && (
				<div>
					{validPools.slice(startIndex, endIndex + 1).map((pool) => {
						const [asset1, asset2] = pool.poolKey.split("-");

						const token1 = tokens[+asset1];
						const token2 = tokens[+asset2];

						const balance1 = new Balance(pool.liquidity[0], token1).toUnit();
						const balance2 = new Balance(pool.liquidity[1], token2).toUnit();

						return (
							<TableRow
								key={pool.poolKey}
								className="[&>div]:flex [&>div]:min-w-[12em] [&>div]:flex-col [&>div]:items-center"
								items={[
									<LPTokens tokens={[token1.symbol, token2.symbol]} key="LP Tokens" />,

									<TokenBalance balance={balance1} token={token1.symbol} key={token1.symbol} />,

									<TokenBalance balance={balance2} token={token2.symbol} key={token2.symbol} />,

									<Liquidity liquidity={pool.liquidityInUSD} key="Liquidity (USD)" />,
								]}
							/>
						);
					})}

					<Pagination {...paginationProps} />
				</div>
			)}
		</>
	);
}
