import { useQuery } from "@tanstack/react-query";

import { TrnTokens } from "../types";
import { fetchTrnTokens } from "../utils";

export function useFetchTrnTokens(trnTokens?: TrnTokens) {
	return useQuery({
		queryKey: ["tokenMetadata"],
		queryFn: async () => await fetchTrnTokens(),
		// staleTime: 1000 * 60,
		initialData: trnTokens,
		// refetchInterval: 1000 * 60 * 5,
		refetchOnWindowFocus: true,
	});
}
