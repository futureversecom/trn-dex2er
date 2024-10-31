"use client";

import { useCallback } from "react";

import { Bridge } from "@/libs/components/bridge";
import { Buttons } from "@/libs/components/shared";
import { useBridge, useWallets } from "@/libs/context";

const networks: Array<"root" | "xrpl"> = ["root", "xrpl"];

export default function Home() {
	const { setToken, setAmount } = useBridge();
	const { network, setNetwork } = useWallets();

	const onNetworkSwitch = useCallback(
		(network: "root" | "xrpl") => {
			setAmount("");
			setToken(undefined);
			setNetwork(network);
		},
		[setAmount, setToken, setNetwork]
	);

	return (
		<>
			<Buttons
				activeIndex={networks.indexOf(network)}
				buttons={networks.map((network) => ({
					children: `${network} network`,
					onClick: () => onNetworkSwitch(network),
				}))}
			/>

			<Bridge />
		</>
	);
}
