import { useTrnApi } from "@futureverse/react";
import type { QueryableStorageMultiArg, VoidFn } from "@polkadot/api/types";
import type { Option } from "@polkadot/types";
import type { FrameSystemAccountInfo, PalletAssetsAssetAccount } from "@polkadot/types/lookup";
import { useCallback, useState } from "react";

import { useWallets } from "../context";
import type { TrnToken, TrnTokens } from "../types";
import { Balance } from "../utils";
import { useTrnApiSubscription } from "./useTrnApiSubscription";

type TokenBalances = Record<number, Balance<TrnToken>>;

export function useTrnBalanceSubscription(
	tokens?: TrnTokens
): [TokenBalances, () => Promise<VoidFn | undefined>] {
	const { trnApi } = useTrnApi();
	const { userSession } = useWallets();
	const [tokenBalances, setTokenBalances] = useState<TokenBalances>({});

	const futurepass = userSession?.futurepass;

	const fetchTokenBalances = useCallback(async () => {
		if (!trnApi?.isReady || !tokens || !futurepass) return;

		const specVersion = trnApi.runtimeVersion.specVersion.toNumber();

		const nonRootTokens = Object.entries(tokens).filter(([tokenId]) => +tokenId !== 1);

		const nonRootTokenQueries = nonRootTokens.map(([tokenId]) => [
			trnApi.query.assets.account,
			[+tokenId, futurepass],
		]) as Array<QueryableStorageMultiArg<"promise">>;

		return await trnApi.queryMulti(
			[[trnApi.query.system.account, futurepass], ...nonRootTokenQueries],
			(res: [FrameSystemAccountInfo, ...Array<Option<PalletAssetsAssetAccount>>]) => {
				const [rootRes, ...rest] = res;

				const rootToken = tokens[1];

				const free = new Balance(rootRes.data.free.toString(), rootToken);
				const frozen = new Balance(
					// eslint-disable-next-line @typescript-eslint/ban-ts-comment
					// @ts-ignore
					rootRes.data[specVersion < 55 ? "miscFrozen" : "frozen"].toString(),
					rootToken
				);
				const rootBalance = free.minus(frozen);

				setTokenBalances({
					1: rootBalance,
					...Object.fromEntries(
						rest.map((res, i) => {
							const { balance } = res.unwrapOr({ balance: 0 });

							return [nonRootTokens[i][0], new Balance(balance.toString(), nonRootTokens[i][1])];
						})
					),
				});
			}
		);
	}, [trnApi, tokens, futurepass]);

	useTrnApiSubscription(fetchTokenBalances);

	return [tokenBalances, fetchTokenBalances];
}
