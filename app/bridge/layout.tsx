
import { BridgeProvider, TrnTokenProvider, XrplCurrencyProvider } from "@/libs/context";
import { fetchTrnTokens, getXrplCurrencies } from "@/libs/utils";
import { use } from "react";

export default function PageLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const trnTokens = use(fetchTrnTokens());


	return (
		<TrnTokenProvider trnTokens={trnTokens}>
			<XrplCurrencyProvider currencies={getXrplCurrencies("bridge")}>
				<BridgeProvider>{children}</BridgeProvider>
			</XrplCurrencyProvider>
		</TrnTokenProvider>
	);
}
