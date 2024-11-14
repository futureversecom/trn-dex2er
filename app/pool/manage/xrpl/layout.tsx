import { ManageXrplPoolProvider } from "@/libs/context";

export default function PageLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return <ManageXrplPoolProvider>{children}</ManageXrplPoolProvider>;
}
