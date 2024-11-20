
import { Nav } from "@/libs/components/pool";
import { TrnTokenProvider } from "@/libs/context";
import { fetchTrnTokens } from "@/libs/utils";
import { use } from "react";

export default function PageLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const trnTokens = use(fetchTrnTokens());

	return (
		<TrnTokenProvider trnTokens={trnTokens}>
			<Nav />
			{children}
		</TrnTokenProvider>
	);
}
