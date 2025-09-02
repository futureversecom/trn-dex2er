import * as Either from "fp-ts/Either";
import { PathReporter } from "io-ts/PathReporter";

import { MONGO_API_URL } from "@/libs/constants";
import { XrplBridgeTransactionC } from "@/libs/types";
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

		const collection = direction === "withdrawal" ? "txWithdrawal" : "txDeposit";

		let $match: any;
		if (direction === "withdrawal") {
			$match = {
				$match: {
					$or: [
						...addresses.map((address) => ({
							from: address,
							...(status != null && { status }),
						})),
						...addresses.map((address) => ({
							sender: address,
						})),
					],
				},
			};
		} else {
			$match = {
				$match: {
					$or: [
						...addresses.map((address) => ({
							from: address,
							...(status != null && { status }),
						})),
					],
				},
			};
		}

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

		const mongoApiUrl = new URL(
			`xrp/${encodeURIComponent(collection)}/action/aggregate`,
			MONGO_API_URL
		);

		const resp = await fetch(mongoApiUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				pipeline: [$match, ...$options],
			}),
		});

		if (resp.status !== 200) {
			const errorText = await resp.text();
			throw new Error(errorText);
		}

		const documents = XrplBridgeTransactionC.decode(await resp.json());
		if (Either.isLeft(documents)) {
			const errors = PathReporter.report(documents);
			console.error("Validation errors:", errors);
			throw new Error(`Invalid bridge history format: ${errors.join(", ")}`);
		}

		return Response.json({ state: "success", history: documents.right });
	} catch (err: any) {
		console.log("err", err);
		return Response.json({ state: "error", error: err?.message ?? err });
	}
}
