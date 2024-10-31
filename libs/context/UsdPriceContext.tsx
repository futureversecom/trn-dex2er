import { useQuery } from "@tanstack/react-query";
import { createContext, type PropsWithChildren, useContext } from "react";

import { fetchTokenPrices } from "../utils";

export type UsdPriceContextType = {
	prices?: Record<string, number>;
};

const UsdPriceContext = createContext<UsdPriceContextType>({} as UsdPriceContextType);

export function UsdPriceProvider({ children }: PropsWithChildren) {
	const { data: prices } = useQuery({
		queryKey: ["usdPrices"],
		queryFn: () => fetchTokenPrices(),
	});

	return (
		<UsdPriceContext.Provider
			value={{
				prices,
			}}
		>
			{children}
		</UsdPriceContext.Provider>
	);
}

export function useUsdPrices() {
	return useContext(UsdPriceContext);
}
