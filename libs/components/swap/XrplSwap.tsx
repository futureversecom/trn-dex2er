import {
	ActionButton,
	AmountInputs,
	Box,
	ConfirmModal,
	ImportToken,
	InfoItem,
	QrModal,
	Ratio,
	SettingsButton,
	SwitchButton,
	Text,
	TokenImage,
	TokenSelect,
} from "@/libs/components/shared";
import { useXrplCurrencies, useXrplSwap, type XrplSwapContextType } from "@/libs/context";
import { useTokenSymbols } from "@/libs/hooks";
import { toFixed, toHuman } from "@/libs/utils";

export function XrplSwap() {
	const props = useXrplSwap();
	const { openImportModal, importModalOpen } = useXrplCurrencies();

	const [xTokenSymbol, yTokenSymbol] = useTokenSymbols(props.xToken, props.yToken);

	const infoItems = getInfoItems({ ...props, xTokenSymbol, yTokenSymbol });

	return (
		<>
			<ImportToken
				open={props.isOpen === false && importModalOpen}
				onClose={() => {
					openImportModal(false);
				}}
			/>

			<TokenSelect
				tokens={props.filteredTokens}
				open={props.isOpen !== false}
				onTokenClick={props.onTokenClick}
				onClose={() => props.setIsOpen(false)}
				onImportTokenClick={() => {
					props.setIsOpen(false);
					openImportModal(true);
				}}
			/>

			<QrModal
				qr={props.qr}
				onClose={() => props.setTag(undefined)}
				open={!!props.qr && props.tag === "sign"}
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
								<TokenImage symbol={xTokenSymbol} issuer={props.xToken.issuer} />
								<Text size="md" className="!text-neutral-600">
									{xTokenSymbol} to spend
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
								<TokenImage symbol={yTokenSymbol} issuer={props.yToken.issuer} />
								<Text size="md" className="!text-neutral-600">
									{yTokenSymbol} to receive
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

			<Box heading="SWAP" className="relative">
				<div className="absolute right-0 top-20 flex w-full justify-center">
					<SwitchButton onClick={props.switchTokens} />
				</div>

				<AmountInputs
					{...{
						xToken: props.xToken,
						yToken: props.yToken,
						labels: ["From", "To"],
						src: props.source,
						isSwap: true,
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
					text={"swap"}
					disabled={props.isDisabled}
					onClick={() => {
						props.buildTransaction();
						props.setTag("review");
					}}
				/>
			</Box>
		</>
	);
}

const getInfoItems = ({
	dexTx,
	yToken,
	xToken,
	yAmount,
	xAmount,
	slippage,
	tradingFee,
	yAmountMin,
	xAmountMax,
	estimatedFee,
	xTokenSymbol = "",
	yTokenSymbol = "",
}: XrplSwapContextType & { xTokenSymbol?: string; yTokenSymbol?: string }) => {
	if (!xToken || !yToken) return null;

	return (
		<>
			{yAmount && (
				<InfoItem
					heading="Estimated received"
					value={`${toHuman(yAmount, yToken)} ${yTokenSymbol}`}
					tip="Is the amount you expect to receive based on the current market price. Keep in mind that the market price may change while your transaction is processing, and may affect the final amount you receive."
				/>
			)}
			{dexTx === "exactSupply" && yAmountMin && (
				<InfoItem
					heading={
						<span>Minimum received after slippage ({slippage === "" ? "0" : slippage}%)</span>
					}
					value={`${yAmountMin.toString()} ${yTokenSymbol}`}
					tip="Is the minimum amount you are guaranteed to receive. However, if the price drops further, your transaction may fail."
				/>
			)}
			{dexTx === "exactTarget" && xAmountMax && (
				<InfoItem
					heading={<span>Maximum spent after slippage ({slippage === "" ? "0" : slippage}%)</span>}
					value={`${xAmountMax.toString()} ${xTokenSymbol}`}
					tip="Is the maximum amount you may need to spend. However, if the price drops further, your transaction may fail."
				/>
			)}
			{estimatedFee && (
				<InfoItem
					heading="Gas Fee"
					value={`~${estimatedFee} XRP`}
					tip="Is the fee paid to the miners who process your transaction."
				/>
			)}
			{xAmount && tradingFee && (
				<>
					<InfoItem
						heading="Swap fee"
						value={`~${toFixed(+xAmount * tradingFee, 6)} ${xTokenSymbol}`}
						tip={`A fee of ${tradingFee}% of the swap amount is collected to reward liquidity providers.`}
					/>
				</>
			)}
		</>
	);
};
