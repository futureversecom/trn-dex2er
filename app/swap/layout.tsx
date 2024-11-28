import {
	TrnSwapProvider,
	TrnTokenProvider,
	XrplCurrencyProvider,
	XrplSwapProvider,
} from "@/libs/context";
import { fetchTrnTokens, getXrplCurrencies } from "@/libs/utils";

const dynamic = "force-dynamic";

export default async function PageLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const trnTokens = await fetchTrnTokens();

	return (
		<TrnTokenProvider trnTokens={trnTokens}>
			<TrnSwapProvider>
				<XrplCurrencyProvider predefinedCurrencies={getXrplCurrencies("swap")}>
					<XrplSwapProvider>{children}</XrplSwapProvider>
				</XrplCurrencyProvider>
			</TrnSwapProvider>
		</TrnTokenProvider>
	);
}
