import { useMemo } from "react";
import { usePagination } from "react-use-pagination";

import { useTrnTokens, useXrplCurrencies } from "@/libs/context";
import type { TrnToken, XrplCurrency } from "@/libs/types";
import { Balance, normalizeCurrencyCode } from "@/libs/utils";

import { LPTokens, Pagination, TableRow, Text } from "../../shared";
import { Liquidity } from "./Liquidity";
import { TokenBalance } from "./TokenBalance";

interface PoolsProps<T> {
	onPoolClick: (xToken: T, yToken: T) => void;
}

interface PoolComponentProps<T> {
	onPoolClick: PoolsProps<T>["onPoolClick"];
	network: "XRP" | "ROOT";
}

type PoolProps<T extends "XRP" | "ROOT"> = T extends "XRP"
	? PoolComponentProps<XrplCurrency>
	: PoolComponentProps<TrnToken>;

export function Pools<T extends "XRP" | "ROOT">(props: PoolProps<T>) {
	const { pools: trnPools, tokens: trnTokens } = useTrnTokens();
	const { pools: xrplPools, findToken } = useXrplCurrencies();
	const { onPoolClick, network } = props;

	const pools = network === "ROOT" ? trnPools : xrplPools;

	const validPools = useMemo(() => {
		return pools.filter((pool) => {
			const [asset1, asset2] = pool.poolKey.split("-");

			if (network === "ROOT") {
				const token1 = trnTokens[+asset1];
				const token2 = trnTokens[+asset2];
				return (
					token1 &&
					token2 &&
					new Balance(pool.liquidity[0], token1 as TrnToken).gt(0) &&
					new Balance(pool.liquidity[1], token1 as TrnToken).gt(0)
				);
			} else {
				const currency1 = findToken(asset1);
				const currency2 = findToken(asset2);

				return (
					currency1 &&
					currency2 &&
					(pool.liquidity[0] as number) > 0 &&
					(pool.liquidity[1] as number) > 0
				);
			}
		});
	}, [findToken, network, pools, trnTokens]);

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

						if (network === "ROOT") {
							const token1 = trnTokens[+asset1];
							const token2 = trnTokens[+asset2];

							const balance1 = new Balance(pool.liquidity[0], token1 as TrnToken).toUnit();
							const balance2 = new Balance(pool.liquidity[1], token2 as TrnToken).toUnit();

							return (
								<TableRow
									key={pool.poolKey}
									onClick={() => onPoolClick(token1 as any, token2 as any)}
									className="[&>div]:flex [&>div]:min-w-[12em] [&>div]:flex-col [&>div]:items-center"
									items={[
										<LPTokens
											tokens={[(token1 as TrnToken).symbol, (token2 as TrnToken).symbol]}
											key="LP Tokens"
										/>,

										<TokenBalance
											balance={balance1}
											token={(token1 as TrnToken).symbol}
											key={(token1 as TrnToken).symbol}
										/>,

										<TokenBalance
											balance={balance2}
											token={(token2 as TrnToken).symbol}
											key={(token2 as TrnToken).symbol}
										/>,

										<Liquidity liquidity={pool.liquidityInUSD} key="Liquidity (USD)" />,
									]}
								/>
							);
						} else {
							const currency1 = findToken(asset1);
							const currency2 = findToken(asset2);

							if (!currency1 || !currency2) {
								// if currencies cannot be found return empty tsx
								return <></>;
							}
							const liquidityPool1 = pool.liquidity[0];
							const liquidityPool2 = pool.liquidity[1];

							return (
								<TableRow
									key={pool.poolKey}
									onClick={() => onPoolClick(currency1 as any, currency2 as any)}
									className="[&>div]:flex [&>div]:min-w-[12em] [&>div]:flex-col [&>div]:items-center"
									items={[
										<LPTokens
											tokens={[
												currency1.ticker || normalizeCurrencyCode(currency1.currency),
												currency2.ticker || normalizeCurrencyCode(currency2.currency),
											]}
											key="LP Tokens"
										/>,

										<TokenBalance
											balance={liquidityPool1 as string}
											token={currency1.ticker || normalizeCurrencyCode(currency1.currency)}
											key={currency1.ticker || currency1.currency}
										/>,

										<TokenBalance
											balance={liquidityPool2 as string}
											token={currency2.ticker || normalizeCurrencyCode(currency2.currency)}
											key={currency2.ticker || currency2.currency}
										/>,

										<Liquidity liquidity={pool.liquidityInUSD} key="Liquidity (USD)" />,
									]}
								/>
							);
						}
					})}

					<Pagination {...paginationProps} />
				</div>
			)}
		</>
	);
}
