import { use } from "react";

import { Nav } from "@/libs/components/pool";
import { TrnTokenProvider } from "@/libs/context";
import { XrplCurrencyProvider } from "@/libs/context";
import { getXrplCurrencies } from "@/libs/utils";

const dynamic = "force-dynamic";

export default async function PageLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<TrnTokenProvider>
			<XrplCurrencyProvider currencies={getXrplCurrencies("pool")}>
				<Nav />
				{children}
			</XrplCurrencyProvider>
		</TrnTokenProvider>
	);
}
