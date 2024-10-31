import { ReverseColorModeProvider, WalletProfileModal } from "@futureverse/component-library";
import * as sdk from "@futureverse/experience-sdk";
import { useAuthenticationMethod } from "@futureverse/react";
import { useState } from "react";

import { useWallets } from "@/libs/context";
import { shortenAddress } from "@/libs/utils";

import { Blockie, Button, Text } from "../";

export function ConnectTrnButton() {
	const auth = useAuthenticationMethod();
	const { connect, disconnect, address } = useWallets();

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
			{isWalletOpen && (
				<div className="absolute right-6 top-14 z-10 text-neutral-100">
					<ReverseColorModeProvider>
						<WalletProfileModal
							// @ts-ignore - just a version mismatch
							auth={auth}
							handleLogout={disconnect}
							handleClose={() => setIsWalletOpen(false)}
							futurePassAddress={sdk.decodedOrThrow(sdk.Address.decode(address))}
						/>
					</ReverseColorModeProvider>
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
