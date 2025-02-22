import { type UserSession } from "@futureverse/auth";
import { useAuth } from "@futureverse/auth-react";
import { useAuthUi } from "@futureverse/auth-ui";
import { upperFirst } from "lodash";
import Image from "next/image";
import {
	createContext,
	type Dispatch,
	type PropsWithChildren,
	type SetStateAction,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { useAccount } from "wagmi";
import { Xumm } from "xumm";

import { Button, Hyperlink, Modal, Text } from "../components/shared";
import { XAMAN_API_KEY } from "../constants";
import {
	type IXrplWalletProvider,
	type ProviderName,
	saveRedirectLocation,
	XrplWalletProvider,
} from "../utils";

export type WalletContextType = {
	network: "root" | "xrpl";
	setNetwork: Dispatch<SetStateAction<"root" | "xrpl">>;
	address?: string;
	isConnected: boolean;
	connect: (xamanWallet?: ProviderName) => void;
	xrplConnect: (xamanWallet: ProviderName) => Promise<void>;
	trnLogin: () => void;
	disconnect: () => Promise<void>;
	userSession?: UserSession;
	xrplProvider?: IXrplWalletProvider;
	isXrplWalletSelectOpen: boolean;
	setIsXrplWalletSelectOpen: Dispatch<SetStateAction<boolean>>;
	rAddress?: string;
	futurepass?: string;
};

const WalletContext = createContext<WalletContextType>({} as WalletContextType);

export function WalletProvider({ children }: PropsWithChildren) {
	const { isConnected: isTrnConnected } = useAccount();
	const { signOut: fpLogout, userSession } = useAuth();
	const { openLogin: fpLogin } = useAuthUi();

	const [xrplAddress, setXrplAddress] = useState<string>();
	const [network, setNetwork] = useState<"root" | "xrpl">("root");
	const [xrplProvider, setXrplProvider] = useState<IXrplWalletProvider>();
	const [isXrplWalletSelectOpen, setIsXrplWalletSelectOpen] = useState(false);

	const address = useMemo(() => {
		if (network === "root") return userSession?.futurepass;

		return xrplAddress;
	}, [network, userSession, xrplAddress]);

	const isConnected = useMemo(() => {
		if (network === "root") return isTrnConnected && !!userSession;

		return !!xrplAddress;
	}, [network, isTrnConnected, userSession, xrplAddress]);

	const trnLogin = useCallback(() => {
		saveRedirectLocation();
		fpLogin();
	}, [fpLogin]);

	const xrplConnect = useCallback(async (wallet: ProviderName) => {
		try {
			const provider = new XrplWalletProvider().detectProvider(
				wallet === "xaman" ? new Xumm(XAMAN_API_KEY) : undefined
			);

			await provider.connect();

			setXrplAddress(provider.getAccount());
			setXrplProvider(provider);
			setIsXrplWalletSelectOpen(false);
		} catch (err) {
			console.warn("Failed to connect to XRPL wallet", err);
		}
	}, []);

	const connect = useCallback(
		(xrplWallet?: ProviderName) => {
			if (network === "root") return trnLogin();

			if (!xrplWallet) return;
			xrplConnect(xrplWallet);
		},
		[network, trnLogin, xrplConnect]
	);

	const xrplDisconnect = useCallback(async () => {
		await xrplProvider?.disconnect();

		setXrplProvider(undefined);
		setXrplAddress(undefined);
	}, [xrplProvider]);

	const disconnect = useCallback(async () => {
		if (network === "root") return fpLogout();

		await xrplDisconnect();
	}, [network, fpLogout, xrplDisconnect]);

	// Ensure Futurepass wallet is connected on user's return to site
	useEffect(() => {
		if (!userSession || isTrnConnected) return;

		window.ethereum?.request({ method: "eth_requestAccounts" });
	}, [userSession, isTrnConnected]);

	const rAddress = useMemo(() => xrplProvider?.getAccount(), [xrplProvider]);

	return (
		<WalletContext.Provider
			value={{
				network,
				setNetwork,
				address,
				connect,
				xrplConnect,
				trnLogin,
				disconnect,
				isConnected,
				xrplProvider,
				userSession: userSession ?? undefined,
				isXrplWalletSelectOpen,
				setIsXrplWalletSelectOpen,
				rAddress,
				futurepass: userSession?.futurepass,
			}}
		>
			<Modal
				open={isXrplWalletSelectOpen}
				onClose={() => setIsXrplWalletSelectOpen(false)}
				heading="select wallet"
			>
				<div>
					<WalletOption name="crossmark" href="https://crossmark.io/" />
					<WalletOption name="xaman" href="https://xaman.app/" />
				</div>
			</Modal>
			{children}
		</WalletContext.Provider>
	);
}

export function useWallets() {
	return useContext(WalletContext);
}

function WalletOption({ name, href }: { name: ProviderName; href?: string }) {
	const { xrplConnect: connect, xrplProvider, disconnect } = useWallets();

	const onClick = useCallback(
		async (name: ProviderName) => {
			if (xrplProvider?.type !== name) return connect(name);

			await disconnect();
		},
		[xrplProvider, connect, disconnect]
	);

	return (
		<div className="flex w-full items-center justify-between border-b border-neutral-500 border-opacity-50 bg-neutral-400 p-4">
			<div className="flex w-2/3 items-center gap-2">
				<Image src={`/images/${name}.png`} alt={name} width={24} height={24} />

				<div>
					<Text className="font-semibold">{upperFirst(name)}</Text>
					<Text className="!text-neutral-500" size="xs">
						Browser extension{" "}
						{href && (
							<Hyperlink className="text-primary-700 underline" href={href} target="_blank">
								Download
							</Hyperlink>
						)}
					</Text>
				</div>
			</div>

			<Button variant="primary" size="sm" className="px-8" onClick={onClick.bind(null, name)}>
				{xrplProvider?.type === name ? "disconnect" : "connect"}
			</Button>
		</div>
	);
}
