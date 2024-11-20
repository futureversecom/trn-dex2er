
import { Nav } from "@/libs/components/pool";
import { TrnTokenProvider } from "@/libs/context";

export default function PageLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {

	return (
		<TrnTokenProvider>
			<Nav />
			{children}
		</TrnTokenProvider>
	);
}
