import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { useWallets } from "../context";

export type XrplBridgeTransaction = {
	from: string;
	to: string;
	status: string;
	createdAt: string;
	updatedAt: string;
	extrinsicId: string;
	xrplHash: string;
	xrpValue: {
		amount: string;
		tokenName: string;
	};
};

export function useBridgeHistory() {
	const { network, rAddress, futurepass } = useWallets();

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
			});

			const result = await res.json();
			if (result.state === "error") throw new Error(result.error);

			return result.documents;
		},
		...{ enabled: !!address, refetchInterval: 5000 },
	});

	return documents;
}
