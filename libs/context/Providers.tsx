import { porcini, root } from "@futureverse/auth";
import { FutureverseAuthProvider, FutureverseWagmiProvider } from "@futureverse/auth-react";
import { FutureverseAuthClient } from "@futureverse/auth-react/auth";
import { createWagmiConfig } from "@futureverse/auth-react/wagmi";
import { AuthUiProvider, DefaultTheme, type ThemeConfig } from "@futureverse/auth-ui";
import { TrnApiProvider } from "@futureverse/transact-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { NetworkName } from "@therootnetwork/api";
import "@therootnetwork/api-types";
import { State } from "wagmi";

import { FV_CLIENT_ID, ROOT_NETWORK, WC_PROJECT_ID, XAMAN_API_KEY } from "@/libs/constants";

import { UsdPriceProvider } from "./UsdPriceContext";
import { WalletProvider } from "./WalletContext";

const customThemeConfig: ThemeConfig = {
	...DefaultTheme,
	defaultAuthOption: "web3",
	colors: {
		...DefaultTheme.colors,
		surface: "rgba(0, 0, 0, 0.6)",
		page: "transparent",
	},
};

const network = (ROOT_NETWORK.NetworkName ?? "porcini") as NetworkName | undefined;

const authClient = new FutureverseAuthClient({
	clientId: FV_CLIENT_ID,
	redirectUri: `${typeof window !== "undefined" ? `${window.location.origin}/login` : ""}`,
	environment: ROOT_NETWORK.Stage,
});

const queryClient = new QueryClient();

export const getWagmiConfig = async () => {
	return createWagmiConfig({
		walletConnectProjectId: WC_PROJECT_ID,
		xamanAPIKey: XAMAN_API_KEY,
		authClient,
		chains: [root, porcini],
		ssr: true,
	});
};

export const Providers = ({
	children,
	initialWagmiState,
}: {
	children: React.ReactNode;
	initialWagmiState?: State;
}) => {
	return (
		<QueryClientProvider client={queryClient}>
			<TrnApiProvider network={network}>
				<FutureverseWagmiProvider getWagmiConfig={getWagmiConfig} initialState={initialWagmiState}>
					<FutureverseAuthProvider authClient={authClient}>
						<AuthUiProvider authClient={authClient} themeConfig={customThemeConfig}>
							<WalletProvider key="wallet-provider">
								<UsdPriceProvider key="usd-price-provider">{children}</UsdPriceProvider>
							</WalletProvider>
						</AuthUiProvider>
					</FutureverseAuthProvider>
				</FutureverseWagmiProvider>
			</TrnApiProvider>
		</QueryClientProvider>
	);
};
