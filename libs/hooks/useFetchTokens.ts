import { useQuery } from "@tanstack/react-query";
import { fetchTrnTokens } from "../utils";
import { TrnTokens } from "../types";

export function useFetchTrnTokens(trnTokens?: TrnTokens) {
	return useQuery({
		queryKey: ["tokenMetadata"], 
		queryFn: async () => await fetchTrnTokens(),
		staleTime: Infinity,
		initialData: trnTokens,
	})
}