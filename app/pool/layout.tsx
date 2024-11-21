import { Nav } from "@/libs/components/pool";
import { TrnTokenProvider } from "@/libs/context";
import { fetchTrnTokens } from "@/libs/utils";

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
