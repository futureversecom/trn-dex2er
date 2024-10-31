import type { TrnToken } from "@/libs/types";
import { Balance } from "@/libs/utils";

import { Text } from "../../shared";

export function TokenBalance({ balance, token }: { token: string; balance: Balance<TrnToken> }) {
	return (
		<div className="space-y-2">
			<Text>{balance.toNumber().toLocaleString("en-US")}</Text>

			<Text className="!text-neutral-500">{token}</Text>
		</div>
	);
}
