import { AddLiquidityXrplProvider } from "@/libs/context";

export default function PageLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return <AddLiquidityXrplProvider>{children}</AddLiquidityXrplProvider>;
}
