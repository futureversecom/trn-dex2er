import { useAuth } from "@futureverse/auth-react";
import { useState } from "react";

import { useWallets } from "@/libs/context";
import { useAuthenticationMethod } from "@/libs/hooks";
import { shortenAddress } from "@/libs/utils";

import { Blockie, Button, Text } from "../";
import WalletProfileModal from "../WalletProfileModal";

export function ConnectTrnButton() {
	const auth = useAuthenticationMethod();
	const { connect, disconnect, address } = useWallets();
	const { userSession } = useAuth();

	const [isWalletOpen, setIsWalletOpen] = useState(false);

	if (!address) {
		return (
			<Button variant="primary" size="sm" className="px-8" onClick={() => connect()}>
				connect wallet
			</Button>
		);
	}

	return (
		<>
			{isWalletOpen && userSession?.futurepass && auth && (
				<div className="absolute right-6 top-14 z-10 text-neutral-100">
					<WalletProfileModal
						auth={auth}
						handleLogout={disconnect}
						futurePassAddress={userSession.futurepass}
					/>
				</div>
			)}

			<div className="flex items-center">
				<Blockie address={address} diameter={32} className="h-8 rounded-full" />

				<Button
					chevron
					size="sm"
					variant="ghost"
					className="hover:bg-transparent"
					onClick={() => setIsWalletOpen((prev) => !prev)}
				>
					<Text variant="heading">{shortenAddress(address)}</Text>
				</Button>
			</div>
		</>
	);
}
