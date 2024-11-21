
import {
	TrnSwapProvider,
	TrnTokenProvider,
	XrplCurrencyProvider,
	XrplSwapProvider,
} from "@/libs/context";
import { getXrplCurrencies } from "@/libs/utils";

export default function PageLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	// const trnTokens = use(fetchTrnTokens());

	return (
		// <TrnTokenProvider trnTokens={trnTokens}>
		<TrnTokenProvider>
			<TrnSwapProvider>
				<XrplCurrencyProvider currencies={getXrplCurrencies("swap")}>
					<XrplSwapProvider>{children}</XrplSwapProvider>
				</XrplCurrencyProvider>
			</TrnSwapProvider>
		</TrnTokenProvider>
	);
}
