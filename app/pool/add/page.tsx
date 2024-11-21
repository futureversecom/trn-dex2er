"use client";

import { AddLiquidity } from "@/libs/components/pool";
import { Text } from "@/libs/components/shared";

export default function Home() {
	return (
		<div className="relative">
			<AddLiquidity>
				<Text>
					By adding liquidity you&apos;ll earn <b>0.3%</b> of all trades on this pair proportional
					to your share of the pool. Fees are added to the pool, accrue in real time and can be
					claimed by withdrawing your liquidity.
				</Text>
			</AddLiquidity>
		</div>
	);
}
