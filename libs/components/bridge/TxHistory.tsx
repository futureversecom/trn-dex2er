import { utils as ethers } from "ethers";
import { useMemo } from "react";
import { dropsToXrp } from "xrpl";

import { ROOT_NETWORK } from "@/libs/constants";
import { useWallets, useXrplCurrencies } from "@/libs/context";
import { useBridgeHistory } from "@/libs/hooks";
import { formatRootscanId, formatTime, getXrplExplorerUrl } from "@/libs/utils";

const statusMap = {
	Processing: "Processing",
	ProcessingOk: "Success",
	ProcessingFailed: "Failed",
} as const;

type TxStatus = keyof typeof statusMap;

export function TxHistory() {
	const { network } = useWallets();
	const history = useBridgeHistory();

	const { currencies } = useXrplCurrencies();

	const transactions = useMemo(() => {
		if (!history) return;

		return history.map((tx) => {
			const explorerLink =
				network === "root"
					? `${ROOT_NETWORK.ExplorerUrl}/extrinsic/${formatRootscanId(tx.extrinsicId)}`
					: `${getXrplExplorerUrl("Bridge")}/transactions/${tx.xrplHash}`;

			const { tokenName } = tx.xrpValue;

			const xrplCurrency = currencies.find(
				(currency) =>
					currency.currency ===
					(tokenName.length === 3
						? tokenName
						: tokenName.startsWith("0x")
							? tokenName.substring(2).toUpperCase()
							: tokenName.toUpperCase())
			);
			if (!xrplCurrency && tokenName !== "XRP")
				throw new Error(`Unable to find XRPL currency ${tx.xrpValue.tokenName}`);

			const amount =
				tokenName === "XRP"
					? dropsToXrp(tx.xrpValue.amount.split(".")[0])
					: {
							value:
								network === "xrpl"
									? ethers.formatUnits(tx.xrpValue.amount, xrplCurrency?.decimals)
									: tx.xrpValue.amount,
							currency: xrplCurrency?.ticker || xrplCurrency?.currency,
						};

			return {
				from: tx.sender || tx.from,
				to: tx.to,
				status: statusMap[tx.status as TxStatus] ?? "Processing",
				amount,
				explorerLink,
				date: formatTime(tx.createdAt),
			};
		});
	}, [history, network, currencies]);

	return (
		<div>
			{transactions &&
				transactions.map((tx, i) => (
					<pre key={i}>
						<code>{JSON.stringify(tx, null, 2)}</code>
					</pre>
				))}
		</div>
	);
}
