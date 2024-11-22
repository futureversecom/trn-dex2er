import { BridgeProvider, TrnTokenProvider, XrplCurrencyProvider } from "@/libs/context";
import { fetchTrnTokens, getXrplCurrencies } from "@/libs/utils";
import { use } from "react";

const dynamic = "force-dynamic";

export default async function PageLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {

	const trnTokens = await fetchTrnTokens();

	return (
		<TrnTokenProvider trnTokens={trnTokens}>
		{/* <TrnTokenProvider > */}
			<XrplCurrencyProvider currencies={getXrplCurrencies("bridge")}>
				<BridgeProvider>{children}</BridgeProvider>
			</XrplCurrencyProvider>
		</TrnTokenProvider>
	);
}
