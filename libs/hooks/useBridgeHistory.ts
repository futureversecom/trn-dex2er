import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { useWallets } from "../context";
import { XrplBridgeTransaction } from "../types";

export function useBridgeHistory() {
	const { network, rAddress, futurepass, userSession } = useWallets();

	const addresses = useMemo(
		() =>
			network === "root"
				? [futurepass, futurepass?.toLowerCase(), userSession?.eoa, userSession?.eoa?.toLowerCase()]
				: [rAddress, rAddress?.toLowerCase()],
		[network, futurepass, rAddress, userSession]
	);

	const queryResult = useQuery({
		queryKey: [`bridge-history-${network}`, addresses],
		queryFn: async (): Promise<XrplBridgeTransaction> => {
			const res = await fetch("/api/fetchBridgeHistory", {
				method: "POST",
				body: JSON.stringify({
					limit: 25,
					direction: network === "root" ? "withdrawal" : "deposit",
					addresses,
				}),
				headers: {
					"Content-Type": "application/json",
					"Authorization": `Bearer ${userSession?.user?.access_token}`,
				},
			});

			const result = await res.json();
			if (result.state === "error") throw new Error(result.error);

			return result.history;
		},
		...{ enabled: !!addresses.length, refetchInterval: 5000 },
	});

	return queryResult;
}
