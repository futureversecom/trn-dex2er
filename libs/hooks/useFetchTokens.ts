import { useQuery } from "@tanstack/react-query";
import { fetchTrnTokens } from "../utils";

export function useFetchTrnTokens() {
	return useQuery({
		queryKey: ["tokenMetadata"], 
		queryFn: async () => await fetchTrnTokens(),
		staleTime: Infinity,
	})
}