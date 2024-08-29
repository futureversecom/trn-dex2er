import { useTrnApi } from "@futureverse/react";
import { useCallback } from "react";

import { fetchPairStatus } from "../utils";

export function useCheckValidPool() {
	const { trnApi } = useTrnApi();

	return useCallback(
		async (pair: [number, number]) => {
			if (!trnApi?.isReady) return true;

			const isValid = await fetchPairStatus(trnApi, pair);
			if (isValid) return true;

			return false;
		},
		[trnApi]
	);
}
