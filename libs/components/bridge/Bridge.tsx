import classNames from "@sindresorhus/class-names";
import { useMemo } from "react";

import {
	ActionButton,
	AmountInput,
	Box,
	Button,
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
import { Balance, isXrplCurrency } from "@/libs/utils";

export function Bridge() {
	const props = useBridge();

	const infoItems = getInfoItems(props);

	const tokenSymbol = useMemo(() => {
		const token = props.token;
		if (!token) return "";

		if (isXrplCurrency(token)) return token.ticker || token.currency;

		return token.symbol;
	}, [props.token]);

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

			{props.token && (
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
								<TokenImage symbol={tokenSymbol} />
								<Text size="md" className="!text-neutral-600">
									{tokenSymbol} to bridge
								</Text>
							</span>
						}
						value={props.amount ?? ""}
					/>

					<div className="py-2">
						<hr className="border-neutral-600" />
					</div>

					{infoItems}
				</ConfirmModal>
			)}

			<Box heading="BRIDGE" className="relative">
				<AmountInput {...props} label="From">
					<Button
						variant="secondary"
						size="sm"
						className="text-neutral-700"
						onClick={() => {
							if (!props.tokenBalance) return props.setAmount("");

							props.setAmount(
								props.tokenBalance instanceof Balance
									? props.tokenBalance.toUnit().toString()
									: props.tokenBalance
							);
						}}
					>
						max
					</Button>
					<Button
						chevron
						size="sm"
						onClick={() => props.setIsOpen(true)}
						variant={props.token ? "secondary" : "primary"}
						className={classNames(props.token && "text-neutral-700")}
						icon={tokenSymbol ? <TokenImage symbol={tokenSymbol} /> : undefined}
					>
						{tokenSymbol ? tokenSymbol : "select token"}
					</Button>
				</AmountInput>

				{props.error && (
					<Text className="text-red-300" size="md">
						{props.error}
					</Text>
				)}

				{tokenSymbol && (
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
