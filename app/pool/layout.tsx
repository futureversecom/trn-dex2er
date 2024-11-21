import { Nav } from "@/libs/components/pool";
import { TrnTokenProvider } from "@/libs/context";
import { fetchTrnTokens } from "@/libs/utils";
import { use } from "react";

export default async function PageLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const trnTokens = await fetchTrnTokens();

	return (
		<TrnTokenProvider trnTokens={trnTokens}>
			<Nav />
			{children}
		</TrnTokenProvider>
	);
}
