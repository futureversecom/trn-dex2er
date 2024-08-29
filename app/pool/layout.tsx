import { use } from "react";

import { Nav } from "@/libs/components/pool";
import { TrnTokenProvider } from "@/libs/context";
import { fetchTrnTokens } from "@/libs/utils";

export default function PageLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const trnTokens = use(fetchTrnTokens());

	return (
		<TrnTokenProvider tokens={trnTokens}>
			<Nav />
			{children}
		</TrnTokenProvider>
	);
}
