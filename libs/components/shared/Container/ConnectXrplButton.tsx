import { useWallets } from "@/libs/context";
import { truncateAddress } from "@/libs/utils";

import { Blockie, Button, Text } from "../";

export function ConnectXrplButton() {
	const { address, setIsXrplWalletSelectOpen } = useWallets();

	if (!address)
		return (
			<Button
				variant="primary"
				size="sm"
				className="px-8"
				onClick={() => setIsXrplWalletSelectOpen(true)}
			>
				connect wallet
			</Button>
		);

	return (
		<div className="flex items-center">
			<Blockie address={address} diameter={32} className="h-8 rounded-full" />

			<Button
				chevron
				size="sm"
				variant="ghost"
				className="hover:bg-transparent"
				onClick={() => setIsXrplWalletSelectOpen((prev) => !prev)}
			>
				<Text variant="heading">{truncateAddress(address)}</Text>
			</Button>
		</div>
	);
}
