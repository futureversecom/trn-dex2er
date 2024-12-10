import { useAuth } from "@futureverse/auth-react";
import { deriveAddressPair } from "@therootnetwork/extrinsic";
import { useMemo } from "react";

export function useAuthenticationMethod() {
	const { userSession } = useAuth();

	const authenticationMethod = useMemo(() => {
		const subId = userSession?.user?.profile.sub;

		if (!subId) {
			return null;
		}

		const parts = subId.split(":");

		switch (parts[0]) {
			case "eoa":
				return {
					method: "wagmi" as const,
					eoa: parts[1] as `0x${string}`,
				};
			case "xrpl": {
				const [, rAddress] = deriveAddressPair(parts[1]);

				if (!rAddress) {
					return null;
				}

				return {
					method: "xaman" as const,
					rAddress,
				};
			}
			default: {
				if (userSession.user?.profile.email) {
					return {
						method: "fv:email" as const,
						email: userSession.user?.profile.email,
					};
				}
			}
		}

		return null;
	}, [userSession]);

	return authenticationMethod;
}
