import { useAuth } from "@futureverse/auth-react";
import { useMemo } from "react";
import { useConnectors } from "wagmi";

import { AuthMethod, UserAuthenticationMethod } from "@/libs/types";
import { hush } from "@/libs/utils";

/**
 * Hook to retrieve the user's authentication method from their session.
 *
 * This function uses `useAuth` to get the `userSession`, and then
 * determines the user's authentication method by decoding the session's profile.
 * If the method is 'fv:dynamic-custodial-idp' (for social logins like Google, Facebook, etc.)
 * or 'fv:email', it adds the email to the authentication method object before returning it.
 *
 * @returns {object|null} An object representing the user's authentication method, or null if the session is not available. The returned object can have the following structure:
 *
 * - For 'fv:email' method:
 *   ```json
 *   {
 *     "method": "fv:email",
 *     "email": "user@example.com"
 *   }
 *   ```
 *
 * - For 'fv:dynamic-custodial-idp' for a custodial login method like facebook, google, apple etc.:
 *   ```json
 *   {
 *     "method": "fv:dynamic-custodial-idp",
 *     "idp": "facebook",
 *     "sub": "1234567890abcdef1234567890abcdef12345678",
 *     "name": "Facebook",
 *     "email": "user@example.com", (optional)
 *     "darkIcon": "https://example.com/dark-icon.png", (optional)
 *     "lightIcon": "https://example.com/light-icon.png" (optional)
 *   }
 *   ```
 *
 * - For 'wagmi' method:
 *   ```json
 *   {
 *     "method": "wagmi",
 *     "eoa": "0x1234567890abcdef1234567890abcdef12345678"
 *   }
 *   ```
 *
 * - For 'xaman' method:
 *   ```json
 *   {
 *     "method": "xaman",
 *     "rAddress": "rExampleAddress"
 *   }
 *   ```
 */
export function useAuthenticationMethod(): UserAuthenticationMethod | null {
	const { userSession } = useAuth();
	const connectors = useConnectors();

	const custodialConnectors = connectors
		.filter((conn: any) => conn.type.startsWith("FutureverseCustodial"))
		.map((connector: any) => ({
			name: connector.name,
			iconDark: connector.iconDark,
			iconLight: connector.iconLight,
		}));

	return useMemo(() => {
		if (userSession == null || userSession.user?.profile.sub == null) {
			return null;
		}

		const userAuthenticationMethod = hush(AuthMethod.decode(userSession.user.profile.sub));

		if (!userAuthenticationMethod) {
			return null;
		}

		if (userAuthenticationMethod.method === "fv:dynamic-custodial-idp") {
			const connector = custodialConnectors.find(
				(c: any) => c.name.toLowerCase() === userAuthenticationMethod.idp.toLowerCase()
			);

			if (connector != null) {
				userAuthenticationMethod.darkIcon = String(connector.iconDark);
				userAuthenticationMethod.lightIcon = String(connector.iconLight);
				userAuthenticationMethod.name = String(connector.name);
			} else {
				userAuthenticationMethod.name = userAuthenticationMethod.idp;
			}
		}

		if (
			userAuthenticationMethod != null &&
			userSession.user.profile.email &&
			"email" in userAuthenticationMethod
		) {
			userAuthenticationMethod.email = userSession.user.profile.email;
		}

		return userAuthenticationMethod as UserAuthenticationMethod;
	}, [userSession, custodialConnectors]);
}
