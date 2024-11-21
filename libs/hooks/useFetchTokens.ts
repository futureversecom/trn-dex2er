import { useQuery } from "@tanstack/react-query";
import { fetchTrnTokens } from "../utils";
import { TrnTokens } from "../types";

export function useFetchTrnTokens(trnTokens?: TrnTokens) {
	return useQuery({
		queryKey: ["tokenMetadata"], 
		queryFn: async () => await fetchTrnTokens(),
		staleTime: 1000 * 60,
		initialData: trnTokens,
		refetchInterval: 1000 * 60 * 5,
		refetchOnWindowFocus: true,
	})
}