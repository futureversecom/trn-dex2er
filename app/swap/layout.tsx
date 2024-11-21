import {
	TrnSwapProvider,
	TrnTokenProvider,
	XrplCurrencyProvider,
	XrplSwapProvider,
} from "@/libs/context";
import { fetchTrnTokens, getXrplCurrencies } from "@/libs/utils";
import { use } from "react";

export default async function PageLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const trnTokens = await fetchTrnTokens();

	return (
		<TrnTokenProvider trnTokens={trnTokens}>
		{/* <TrnTokenProvider> */}
			<TrnSwapProvider>
				<XrplCurrencyProvider currencies={getXrplCurrencies("swap")}>
					<XrplSwapProvider>{children}</XrplSwapProvider>
				</XrplCurrencyProvider>
			</TrnSwapProvider>
		</TrnTokenProvider>
	);
}
