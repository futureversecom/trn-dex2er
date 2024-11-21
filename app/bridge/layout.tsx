
import { BridgeProvider, TrnTokenProvider, XrplCurrencyProvider } from "@/libs/context";
import { getXrplCurrencies } from "@/libs/utils";

export default function PageLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {



	return (
		// <TrnTokenProvider trnTokens={trnTokens}>
		<TrnTokenProvider >
			<XrplCurrencyProvider currencies={getXrplCurrencies("bridge")}>
				<BridgeProvider>{children}</BridgeProvider>
			</XrplCurrencyProvider>
		</TrnTokenProvider>
	);
}
