import classNames from "@sindresorhus/class-names";
import { utils as ethers } from "ethers";
import { useMemo } from "react";
import { dropsToXrp } from "xrpl";

import { Hyperlink, TableRow, Text, TokenImage } from "@/libs/components/shared";
import { ROOT_NETWORK } from "@/libs/constants";
import { useWallets } from "@/libs/context";
import { useBridgeHistory } from "@/libs/hooks";
import { getXrplCurrencies } from "@/libs/utils";
import { formatRootscanId, formatTime, getXrplExplorerUrl, shortenAddress } from "@/libs/utils";

const statusMap = {
	Processing: "Processing",
	ProcessingOk: "Success",
	ProcessingFailed: "Failed",
} as const;

type TxStatus = keyof typeof statusMap;

export function TxHistory() {
	const { network } = useWallets();
	const history = useBridgeHistory();

	const bridgeCurrencies = getXrplCurrencies("bridge");

	const transactions = useMemo(() => {
		if (!history) return;

		return history.map((tx) => {
			const explorerLink =
				network === "root"
					? `${ROOT_NETWORK.ExplorerUrl}/extrinsic/${formatRootscanId(tx.extrinsicId)}`
					: `${getXrplExplorerUrl("Bridge")}/transactions/${tx.xrplHash}`;

			const { tokenName } = tx.xrpValue;

			const xrplCurrency = bridgeCurrencies.find(
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
				token: typeof amount === "string" ? "XRP" : amount.currency,
			};
		});
	}, [history, network, bridgeCurrencies]);

	return (
		<div className="pt-6">
			<Text variant="heading" className="flex justify-center" size="xl">
				Transaction History
			</Text>
			{!transactions ? (
				<Text className="flex justify-center">
					This is where your transaction history will appear.
				</Text>
			) : (
				<div className="flex flex-col space-y-2 pt-4">
					{transactions.map((tx, i) => (
						<Hyperlink
							href={tx.explorerLink}
							key={i}
							target="_blank"
							className="flex justify-center"
						>
							<TableRow
								className="[&>div]:flex [&>div]:min-w-[8em] [&>div]:flex-col [&>div]:items-center"
								items={[
									<div key="token" className="space-y-2">
										<TokenImage symbol={tx.token as string} size={28} />
										<Text className="!text-neutral-500">{tx.token}</Text>
									</div>,
									<div key="amount" className="space-y-2">
										<Text>{typeof tx.amount === "string" ? tx.amount : tx.amount.value}</Text>
										<Text className="!text-neutral-500">Amount</Text>
									</div>,
									<div key="from" className="space-y-2">
										<Text>{shortenAddress(tx.from)}</Text>
										<Text className="!text-neutral-500">From</Text>
									</div>,
									<div key="to" className="space-y-2">
										<Text>{shortenAddress(tx.to)}</Text>
										<Text className="!text-neutral-500">To</Text>
									</div>,
									<div key="status" className="space-y-2">
										<Text
											className={classNames(
												{
													Success: "!text-green-400",
													Processing: "!text-yellow-400",
													Failed: "!text-red-400",
												}[tx.status]
											)}
										>
											{tx.status}
										</Text>
										<Text className="!text-neutral-500">Status</Text>
									</div>,
								]}
							/>
						</Hyperlink>
					))}
				</div>
			)}
		</div>
	);
}
