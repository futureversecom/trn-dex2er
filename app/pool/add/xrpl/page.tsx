"use client";

import { AddLiquidityXrpl } from "@/libs/components/pool";
import { Pools } from "@/libs/components/pool/Pools";
import { BackButton, Box, Text } from "@/libs/components/shared";
import { useAddLiquidityXrpl, useXrplCurrencies } from "@/libs/context";

export default function Home() {
	const { isFetching } = useXrplCurrencies();
	const { xToken, yToken, resetState, onPoolClick } = useAddLiquidityXrpl();

	if (!xToken && !yToken) {
		return (
			<Box heading="pools" isLoading={isFetching}>
				<Pools onPoolClick={onPoolClick} network="XRP" />
			</Box>
		);
	}

	return (
		<div className="relative">
			<BackButton onClick={resetState} />

			<AddLiquidityXrpl>
				<Text>
					By adding liquidity you&apos;ll earn <b>0.3%</b> of all trades on this pair proportional
					to your share of the pool. Fees are added to the pool, accrue in real time and can be
					claimed by withdrawing your liquidity.
				</Text>
			</AddLiquidityXrpl>
		</div>
	);
}
