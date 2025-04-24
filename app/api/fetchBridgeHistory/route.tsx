import { MONGO_API_KEY, MONGO_API_URL, ROOT_NETWORK } from "@/libs/constants";
import { futurepassAuth } from "@/libs/utils/futurepassAuth";

export async function POST(req: Request) {
	try {
		const { isAuthenticated } = await futurepassAuth(req);
		if (!isAuthenticated) {
			return Response.json({ state: "error", error: "Authentication required" }, { status: 401 });
		}

		const { addresses, direction, status, ...options } = ((await req.json()) ?? {}) as {
			direction: "deposit" | "withdrawal";
			addresses: string[];
			status?: string;
			skip?: number;
			limit?: number;
		};

		const collection = direction === "deposit" ? "TxDeposits" : "TxWithdrawals";
		const database = `${ROOT_NETWORK.NetworkName === "root" ? "mainnet" : "porcini"}-xbd`;

		const $match = {
			$match: {
				$or: [
					...addresses.map((address) => ({
						to: address,
						...(status != null && { status }),
					})),
					...addresses.map((address) => ({
						to: address.toLowerCase(),
						...(status != null && { status }),
					})),
					...addresses.map((address) => ({
						from: address,
						...(status != null && { status }),
					})),
					...addresses.map((address) => ({
						from: address.toLowerCase(),
						...(status != null && { status }),
					})),
					...addresses.map((address) => ({
						sender: address,
					})),
					...addresses.map((address) => ({
						sender: address.toLowerCase(),
					})),
				],
			},
		};

		const $options = [
			{
				$sort: { createdAt: -1 },
			},
			{
				...(options.skip && { $skip: options.skip }),
			},
			{
				...(options.limit && { $limit: options.limit }),
			},
		].filter((option) => Object.keys(option).length > 0);

		const resp = await fetch(`${MONGO_API_URL}/action/aggregate`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"api-key": MONGO_API_KEY,
			},
			body: JSON.stringify({
				database,
				collection,
				dataSource: database,
				pipeline: [$match, ...$options],
			}),
		});

		if (resp.status !== 200) {
			throw new Error(await resp.text());
		}

		const { documents } = await resp.json();

		return Response.json({ state: "success", documents });
	} catch (err: any) {
		console.log("err", err);
		return Response.json({ state: "error", error: err?.message ?? err });
	}
}
