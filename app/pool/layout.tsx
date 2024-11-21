
import { Nav } from "@/libs/components/pool";
import { TrnTokenProvider } from "@/libs/context";

export default function PageLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	// const trnTokens = use(fetchTrnTokens());

	return (
		// <TrnTokenProvider trnTokens={trnTokens}>
		<TrnTokenProvider>
			<Nav />
			{children}
		</TrnTokenProvider>
	);
}
