import { ROOT_NETWORK } from "@/libs/constants";

export async function futurepassAuth(req: Request): Promise<{
	isAuthenticated: boolean;
}> {
	try {
		const authHeader = req.headers.get("Authorization");
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return { isAuthenticated: false };
		}

		const response = await fetch(`${ROOT_NETWORK.Environment.idpURL}/me`, {
			method: "GET",
			headers: {
				Authorization: authHeader,
			},
		});

		if (!response.ok) {
			return { isAuthenticated: false };
		}

		const { futurepass } = await response.json();

		if (!futurepass) {
			return { isAuthenticated: false };
		}

		return {
			isAuthenticated: true,
		};
	} catch (error) {
		return { isAuthenticated: false };
	}
}
