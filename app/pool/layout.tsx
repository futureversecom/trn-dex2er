import { Nav } from "@/libs/components/pool";
import { TrnTokenProvider } from "@/libs/context";
import { XrplCurrencyProvider } from "@/libs/context";
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
			<XrplCurrencyProvider predefinedCurrencies={getXrplCurrencies("pool")}>
				<Nav />
				{children}
			</XrplCurrencyProvider>
		</TrnTokenProvider>
	);
}
