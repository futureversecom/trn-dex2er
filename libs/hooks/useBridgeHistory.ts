import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { useWallets } from "../context";
import { XrplBridgeTransaction } from "../types";

export function useBridgeHistory() {
	const { network, rAddress, futurepass, userSession } = useWallets();

	const address = useMemo(
		() => (network === "root" ? futurepass : rAddress),
		[network, futurepass, rAddress]
	);

	const { data: documents } = useQuery({
		queryKey: [`bridge-history-${network}`, address],
		queryFn: async (): Promise<XrplBridgeTransaction[]> => {
			const res = await fetch("/api/fetchBridgeHistory", {
				method: "POST",
				body: JSON.stringify({
					limit: 5,
					direction: network === "root" ? "withdrawal" : "deposit",
					addresses: [address, address?.toLowerCase()],
				}),
				headers: {
					"Content-Type": "application/json",
					"Authorization": `Bearer ${userSession?.user?.access_token}`,
				},
			});

			const result = await res.json();
			if (result.state === "error") throw new Error(result.error);

			return result.documents;
		},
		...{ enabled: !!address, refetchInterval: 5000 },
	});

	return documents;
}
