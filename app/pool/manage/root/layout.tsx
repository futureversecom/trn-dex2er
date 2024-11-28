import { ManagePoolProvider } from "@/libs/context";

export default function PageLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return <ManagePoolProvider>{children}</ManagePoolProvider>;
}
