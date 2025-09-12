import { useAuth } from "@futureverse/auth-react";
import { Dialog } from "@mui/material";
import { useMemo, useState } from "react";

import { useWallets } from "@/libs/context";
import { useAuthenticationMethod } from "@/libs/hooks";
import { truncateAddress } from "@/libs/utils";

import { Blockie, Button, Text } from "../";
import WalletProfileModal, { WalletProfileModalProps } from "../WalletProfileModal";

export function ConnectTrnButton() {
	const auth = useAuthenticationMethod();
	const { connect, disconnect, address } = useWallets();
	const { userSession } = useAuth();

	const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
	const [futurePassCopyState, setFuturePassCopyState] = useState(false);

	const walletModalProps: WalletProfileModalProps | undefined = useMemo(() => {
		if (!userSession?.futurepass || !auth) {
			return undefined;
		}

		return {
			auth,
			futurePassAddress: userSession.futurepass as `0x${string}`,
			handleClose: () => setIsWalletModalOpen(false),
			handleLogout: disconnect,
			futurePassDidCopy: futurePassCopyState,
			onFuturePassCopyStateChange: setFuturePassCopyState,
		};
	}, [auth, userSession?.futurepass, disconnect, futurePassCopyState]);

	if (!address) {
		return (
			<Button variant="primary" size="sm" className="px-8" onClick={() => connect()}>
				connect wallet
			</Button>
		);
	}

	return (
		<>
			<div className="flex items-center">
				<Blockie address={address} diameter={32} className="h-8 rounded-full" />

				<Button
					chevron
					size="sm"
					variant="ghost"
					className="hover:bg-transparent"
					onClick={() => setIsWalletModalOpen(true)}
				>
					<Text variant="heading">{truncateAddress(address)}</Text>
				</Button>
			</div>

			{walletModalProps && (
				<Dialog
					open={isWalletModalOpen}
					scroll="body"
					aria-labelledby="wallet-profile-dialog"
					aria-describedby="wallet-profile-description"
					PaperProps={{
						sx: {
							display: "flex",
							flex: 1,
							position: "fixed",
							top: 80,
							right: 16,
							m: 0,
							backgroundColor: "#1d1e20",
							borderRadius: "8px",
						},
					}}
				>
					<WalletProfileModal {...walletModalProps} />
				</Dialog>
			)}
		</>
	);
}
