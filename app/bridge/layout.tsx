import { BridgeProvider, TrnTokenProvider, XrplCurrencyProvider } from "@/libs/context";
import { fetchTrnTokens, getXrplCurrencies } from "@/libs/utils";

export default async function PageLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const trnTokens = await fetchTrnTokens();

	return (
		<TrnTokenProvider trnTokens={trnTokens}>
			<XrplCurrencyProvider predefinedCurrencies={getXrplCurrencies("bridge")}>
				<BridgeProvider>{children}</BridgeProvider>
			</XrplCurrencyProvider>
		</TrnTokenProvider>
	);
}
