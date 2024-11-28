import { AddLiquidity } from "@/libs/components/pool";
import { Text } from "@/libs/components/shared";

export default function Home() {
	return (
		<AddLiquidity>
			<Text>
				To start a new pool, simply choose a starting price and enter your deposit amount. Please
				note that transaction fees may be higher than usual during the initialization process.
			</Text>
			<Text>
				You can earn <b>0.3%</b> of all trades on this pair based on the amount of liquidity you
				provided. Fees are automatically added to the pool in real-time and can be claimed when you
				withdraw your liquidity.
			</Text>
		</AddLiquidity>
	);
}
