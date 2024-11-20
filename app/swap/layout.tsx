import { use } from "react";

import {
	TrnSwapProvider,
	TrnTokenProvider,
	XrplCurrencyProvider,
	XrplSwapProvider,
} from "@/libs/context";
import { fetchTrnTokens, getXrplCurrencies } from "@/libs/utils";

export default function PageLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const trnTokens = use(fetchTrnTokens());
	console.log(trnTokens);

	return (
		<TrnTokenProvider>
			<TrnSwapProvider>
				<XrplCurrencyProvider currencies={getXrplCurrencies("swap")}>
					<XrplSwapProvider>{children}</XrplSwapProvider>
				</XrplCurrencyProvider>
			</TrnSwapProvider>
		</TrnTokenProvider>
	);
}
