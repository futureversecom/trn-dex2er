import {
	ActionButton,
	AmountInputs,
	Box,
	ConfirmModal,
	InfoItem,
	QrModal,
	Ratio,
	SettingsButton,
	SwitchButton,
	Text,
	TokenImage,
	TokenSelect,
} from "@/libs/components/shared";
import { type TrnBridgeContextType, useTrnBridge } from "@/libs/context";

export function TrnBridge() {
	const props = useTrnBridge();

	const infoItems = getInfoItems(props);

	return (
		<>
			<TokenSelect
				open={props.isOpen !== false}
				onTokenClick={props.onTokenClick}
				onClose={() => props.setIsOpen(false)}
				tokens={Object.values(props.filteredTokens)}
			/>

			<QrModal
				qr={props.xamanData?.qrCodeImg}
				onClose={() => props.setTag(undefined)}
				open={!!props.xamanData && props.tag === "sign"}
			/>

			{props.xToken && props.yToken && (
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
								<TokenImage symbol={props.xToken.symbol} />
								<Text size="md" className="!text-neutral-600">
									{props.xToken.symbol} to spend
								</Text>
							</span>
						}
						value={
							props.xTokenUSD
								? `${props.xAmount} ($${props.xTokenUSD.toLocaleString("en-US")})`
								: props.xAmount
						}
					/>

					<InfoItem
						heading={
							<span className="flex items-center gap-2">
								<TokenImage symbol={props.yToken.symbol} />
								<Text size="md" className="!text-neutral-600">
									{props.yToken.symbol} to receive
								</Text>
							</span>
						}
						value={
							props.yTokenUSD
								? `${props.yAmount} ($${props.yTokenUSD.toLocaleString("en-US")})`
								: props.yAmount
						}
					/>

					<div className="py-2">
						<hr className="border-neutral-600" />
					</div>

					{infoItems}
				</ConfirmModal>
			)}

			<Box heading="BRIDGE" className="relative">
				<div className="absolute right-0 top-20 flex w-full justify-center">
					<SwitchButton onClick={props.switchTokens} />
				</div>

				<AmountInputs
					{...{
						xToken: props.xToken,
						yToken: props.yToken,
						labels: ["From", "To"],
						...props,
						yTokenError: undefined,
					}}
				/>

				{props.error && (
					<Text className="text-red-300" size="md">
						{props.error}
					</Text>
				)}

				{props.xToken && props.yToken && props.ratio && (
					<>
						<div className="flex items-center justify-between px-2">
							<Ratio
								xToken={props.xToken}
								yToken={props.yToken}
								ratio={props.ratio}
								priceDifference={props.priceDifference}
							/>

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

const getInfoItems = ({ gasToken, estimatedFee }: TrnBridgeContextType) => {
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
