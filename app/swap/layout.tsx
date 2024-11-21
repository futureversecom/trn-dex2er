import {
	TrnSwapProvider,
	TrnTokenProvider,
	XrplCurrencyProvider,
	XrplSwapProvider,
} from "@/libs/context";
import { getXrplCurrencies } from "@/libs/utils";

export default function PageLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<TrnTokenProvider>
			<TrnSwapProvider>
				<XrplCurrencyProvider currencies={getXrplCurrencies("swap")}>
					<XrplSwapProvider>{children}</XrplSwapProvider>
				</XrplCurrencyProvider>
			</TrnSwapProvider>
		</TrnTokenProvider>
	);
}
