import { useMemo } from "react";

import {
	ActionButton,
	AmountInput,
	Box,
	ConfirmModal,
	InfoItem,
	QrModal,
	SettingsButton,
	Text,
	TokenImage,
	TokenSelect,
} from "@/libs/components/shared";
import { type BridgeContextType, useBridge } from "@/libs/context";
import type { TrnToken, XrplCurrency } from "@/libs/types";
import { isXrplCurrency } from "@/libs/utils";

export function Bridge() {
	const props = useBridge();

	const infoItems = getInfoItems(props);

	const bridgeTokenSymbol = useMemo(() => {
		const bridgeToken = props.bridgeToken;
		if (!bridgeToken) return "";

		if (isXrplCurrency(bridgeToken)) return bridgeToken.ticker || bridgeToken.currency;

		return bridgeToken.symbol;
	}, [props.bridgeToken]);

	return (
		<>
			<TokenSelect
				open={props.isOpen}
				onTokenClick={props.setToken}
				onClose={() => props.setIsOpen(false)}
				tokens={
					Array.isArray(props.filteredTokens)
						? (props.filteredTokens as XrplCurrency[])
						: (Object.values(props.filteredTokens) as Array<TrnToken>)
				}
			/>

			<QrModal
				qr={props.xamanData?.qrCodeImg}
				onClose={() => props.setTag(undefined)}
				open={!!props.xamanData && props.tag === "sign"}
			/>

			{props.bridgeToken && (
				<ConfirmModal
					tag={props.tag}
					onClose={() => props.setTag(undefined)}
					onConfirm={props.signTransaction}
					description="Once you confirm swap, you’ll be asked to sign a message with
					a hash on your wallet."
					explorerUrl={props.explorerUrl}
					title="Confirm swap"
					error={props.error}
				>
					<InfoItem
						heading={
							<span className="flex items-center gap-2">
								<TokenImage symbol={bridgeTokenSymbol} />
								<Text size="md" className="!text-neutral-600">
									{bridgeTokenSymbol} to bridge
								</Text>
							</span>
						}
						value={props.bridgeAmount ?? ""}
					/>

					<div className="py-2">
						<hr className="border-neutral-600" />
					</div>

					{infoItems}
				</ConfirmModal>
			)}

			<Box heading="BRIDGE" className="relative">
				<AmountInput {...props} />

				{props.error && (
					<Text className="text-red-300" size="md">
						{props.error}
					</Text>
				)}

				{bridgeTokenSymbol && (
					<>
						<div className="flex items-center justify-between px-2">
							<SettingsButton {...props} />
						</div>

						<div className="space-y-2 rounded-lg bg-neutral-400 p-6">{infoItems}</div>
					</>
				)}

				<ActionButton
					text="bridge"
					disabled={props.isDisabled}
					onClick={() => props.setTag("review")}
				/>
			</Box>
		</>
	);
}

const getInfoItems = ({ gasToken, estimatedFee }: BridgeContextType) => {
	if (!estimatedFee) return null;

	return (
		<>
			{estimatedFee && (
				<InfoItem
					heading="Gas Fee"
					value={`~${estimatedFee} ${gasToken.symbol}`}
					tip="Is the fee paid to the miners who process your transaction."
				/>
			)}
		</>
	);
};
