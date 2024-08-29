import type { Metadata } from "next";
import { Poppins } from "next/font/google";

import { Container } from "@/libs/components/shared";
import { DisableMobileProvider, Providers } from "@/libs/context";

import "./globals.css";

const poppins = Poppins({
	weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "Dexter",
	description: "Dex for The Root Network",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body className={poppins.className}>
				<Providers>
					<Container>
						<DisableMobileProvider>{children}</DisableMobileProvider>
					</Container>
				</Providers>
			</body>
		</html>
	);
}
