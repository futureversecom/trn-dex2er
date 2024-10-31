import { utils as ethers } from "ethers";
import { useEffect, useState } from "react";
import { isValidAddress } from "xrpl";

import { useWallets } from "../context";

export function useBridgeDestinationInput() {
	const { network, xrplProvider, userSession } = useWallets();

	const [error, setError] = useState<string>();
	const [destination, setDestination] = useState("");

	useEffect(() => {
		if (network === "xrpl") {
			const trnAddress = userSession?.futurepass;

			return setDestination(trnAddress ?? "");
		}

		const rAddress = xrplProvider?.getAccount();

		setDestination(rAddress ?? "");
	}, [xrplProvider, userSession, network]);

	useEffect(() => {
		if (!destination) return setError(undefined);

		let isInvalidAddress = false;

		if (network === "xrpl") {
			if (!ethers.isAddress(destination)) isInvalidAddress = true;
		}

		if (network === "root") {
			if (!isValidAddress(destination)) isInvalidAddress = true;
		}

		setError(isInvalidAddress ? "Invalid Address" : undefined);
	}, [destination, network]);

	return { destination, setDestination, error };
}
