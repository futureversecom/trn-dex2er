import { FutureverseThemeProvider } from "@futureverse/component-library";
import { FutureverseAuthClient, TrnApiProvider } from "@futureverse/react";
import { WsProvider } from "@polkadot/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@therootnetwork/api-types";
import dynamic from "next/dynamic";
import { cloneElement, type PropsWithChildren, type ReactElement, type ReactNode } from "react";

import { FV_CLIENT_ID, ROOT_NETWORK, WC_PROJECT_ID } from "@/libs/constants";

import { UsdPriceProvider, WalletProvider } from ".";

const FutureverseProvider = dynamic(
	() => import("@futureverse/react").then((mod) => mod.FutureverseProvider),
	{
		ssr: false,
	}
);

const URI_BASE = typeof window !== "undefined" ? window.location.origin : "";

const fvAuthClient = new FutureverseAuthClient({
	clientId: FV_CLIENT_ID,
	redirectUri: `${URI_BASE}/login`,
	environment: ROOT_NETWORK.Environment,
});

const queryClient = new QueryClient();

interface MainProviderProps extends PropsWithChildren {
	providers: ReactElement[];
}

const MainProvider = ({ providers, children }: MainProviderProps) => {
	const renderProvider = (providers: ReactElement[], children: ReactNode): any => {
		const [provider, ...restProviders] = providers;

		if (provider) {
			return cloneElement(provider, undefined, renderProvider(restProviders, children));
		}

		return children;
	};

	return renderProvider(providers, children);
};

export const Providers = ({ children }: PropsWithChildren) => {
	return (
		<MainProvider
			providers={[
				<FutureverseProvider
					Web3Provider="wagmi"
					isCustodialLoginEnabled
					authClient={fvAuthClient}
					key="futureverse-provider"
					stage={ROOT_NETWORK.Stage}
					walletConnectProjectId={WC_PROJECT_ID}
				/>,
				<TrnApiProvider
					key="trn-api-provider"
					provider={new WsProvider(ROOT_NETWORK.ApiUrl.InWebSocket)}
				/>,
				<QueryClientProvider key="query-client-provider" client={queryClient} />,
				<FutureverseThemeProvider key="futureverse-theme-provider" />,
				<WalletProvider key="wallet-provider" />,
				<UsdPriceProvider key="usd-price-provider" />,
			]}
		>
			{children}
		</MainProvider>
	);
};
