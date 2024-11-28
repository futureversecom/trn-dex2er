import { AddLiquidityXrpl } from "@/libs/components/pool";
import { Text } from "@/libs/components/shared";

export default function Home() {
	return (
		<AddLiquidityXrpl>
			<Text>
				To start a new pool, simply choose your tokens, enter your deposit amount and select a
				trading fee. Take caution when creating a new pair you should fund it with (approximately)
				equal-value amounts of each asset. Otherwise, other users can profit at your expensive
				through arbitrage. Please note that transaction fees may be higher than usual during the
				initialization process ~2 xrpl.
			</Text>
			<Text>If your choosen pair already exists you can instead add liquidity for the pool. </Text>
		</AddLiquidityXrpl>
	);
}
