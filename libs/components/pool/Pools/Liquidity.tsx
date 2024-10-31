import BigNumber from "bignumber.js";

import { Text } from "../../shared";

export function Liquidity({ liquidity }: { liquidity?: BigNumber }) {
	return (
		<div className="space-y-2">
			<Text>{liquidity ? `~$${liquidity.toNumber().toLocaleString("en-US")}` : "-"}</Text>

			<Text className="!text-neutral-500">Liquidity (USD)</Text>
		</div>
	);
}
