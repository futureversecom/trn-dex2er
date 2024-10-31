import { AddLiquidityProvider } from "@/libs/context";

export default function PageLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return <AddLiquidityProvider>{children}</AddLiquidityProvider>;
}
