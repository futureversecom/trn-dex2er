import { useTrnApi } from "@futureverse/transact-react";
import { useCallback, useEffect, useState } from "react";

import { DEFAULT_GAS_TOKEN } from "@/libs/constants";
import type { Token, TrnToken } from "@/libs/types";
import { fetchPairStatus, isXrplCurrency } from "@/libs/utils";

import { Button, Dropdown, Modal, Tooltip } from "./";

type SettingsButtonProps = {
	slippage?: string;
	setSlippage?: (slippage: string) => void;
	gasToken?: TrnToken;
	setGasToken?: (token: TrnToken) => void;
	xToken?: Token;
};

export function SettingsButton({
	slippage,
	setSlippage,
	gasToken,
	setGasToken,
	xToken,
}: SettingsButtonProps) {
	const { trnApi } = useTrnApi();

	const [open, setOpen] = useState(false);
	const [gasTokens, setGasTokens] = useState<TrnToken[]>([DEFAULT_GAS_TOKEN]);

	const checkXrpPaths = useCallback(async () => {
		if (!trnApi || !xToken || isXrplCurrency(xToken)) return;

		const isEnabled = await fetchPairStatus(trnApi, [xToken.assetId, DEFAULT_GAS_TOKEN.assetId]);

		setGasTokens([DEFAULT_GAS_TOKEN, ...(isEnabled ? [xToken] : [])] as TrnToken[]);
	}, [trnApi, xToken]);

	useEffect(() => {
		void checkXrpPaths();
	}, [checkXrpPaths]);

	return (
		<>
			<Button size="rounded" variant="tertiary" className="!p-3" onClick={() => setOpen(!open)}>
				<svg width="24" height="25">
					<use xlinkHref="/images/commons.svg#cog" />
				</svg>
			</Button>

			<Modal heading="Settings" open={open} onClose={() => setOpen(false)} className="!w-[25em]">
				{setSlippage && (
					<div>
						<div className="flex items-center gap-2 pb-2">
							<label htmlFor="slippage" className="font-semibold">
								Slippage
							</label>
							<Tooltip
								id="slippage-info"
								tip="Your transaction will revert if the price changes unfavorably by more than this percentage."
							/>
						</div>

						<div className="w-full rounded-lg bg-neutral-200 py-4">
							<input
								id="slippage"
								value={slippage}
								className="bg-transparent pl-4 text-neutral-700 outline-none"
								onChange={(e) => setSlippage(e.target.value)}
							/>
							%
						</div>
					</div>
				)}

				{gasToken && setGasToken && (
					<div>
						<div className="flex items-center gap-2 pb-2">
							<label htmlFor="gas-token" className="font-semibold">
								Pay transaction fee with
							</label>
							<Tooltip id="gas-token-info" tip="Select any token to pay for transaction fee." />
						</div>

						<Dropdown
							className="w-full p-4"
							itemsClassName="w-[22em]"
							current={gasToken.symbol}
							options={gasTokens.map((token) => token.symbol)}
							onSelect={(symbol) =>
								setGasToken(gasTokens.find((token) => token.symbol === symbol)!)
							}
						/>
					</div>
				)}
			</Modal>
		</>
	);
}
