"use client";

import { TrnBridge, XrplBridge } from "@/libs/components/bridge";
import { Buttons } from "@/libs/components/shared";
import { useWallets } from "@/libs/context";

const networks: Array<"root" | "xrpl"> = ["root", "xrpl"];

export default function Home() {
	const { network, setNetwork } = useWallets();

	return (
		<>
			<Buttons
				activeIndex={networks.indexOf(network)}
				buttons={networks.map((network) => ({
					children: `${network} network`,
					onClick: () => setNetwork(network),
				}))}
			/>

			{network === "root" && <TrnBridge />}
			{network === "xrpl" && <XrplBridge />}
		</>
	);
}
