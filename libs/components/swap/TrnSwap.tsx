import {
	ActionButton,
	AmountInputs,
	Box,
	ConfirmModal,
	InfoItem,
	Ratio,
	SettingsButton,
	SwitchButton,
	Text,
	TokenImage,
	TokenSelect,
} from "@/libs/components/shared";
import { EXCHANGE_RATE, NETWORK_FEE_RATE } from "@/libs/constants";
import { type TrnSwapContextType, useTrnSwap } from "@/libs/context";
import { toFixed } from "@/libs/utils";

export function TrnSwap() {
	const props = useTrnSwap();

	const infoItems = getInfoItems(props);

	return (
		<>
			<TokenSelect
				open={props.isOpen !== false}
				onTokenClick={props.onTokenClick}
				onClose={() => props.setIsOpen(false)}
				tokens={Object.values(props.filteredTokens)}
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

				{props.xToken && props.yToken && props.ratio && !!props.xAmount && !!props.yAmount && (
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
					text="swap"
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
	xToken,
	yToken,
	xAmount,
	slippage,
	gasToken,
	xAmountMax,
	yAmountMin,
	estimatedFee,
}: TrnSwapContextType) => {
	if (!xToken || !yToken || !dexTx) return null;

	return (
		<>
			{dexTx === "exactSupply" && yAmountMin && (
				<InfoItem
					heading={
						<span>Minimum received after slippage ({slippage === "" ? "0" : slippage}%)</span>
					}
					value={`${yAmountMin.toHuman()} ${yToken!.symbol}`}
					tip="Is the minimum amount you are guaranteed to receive. However, if the price drops further, your transaction may fail."
				/>
			)}
			{dexTx === "exactTarget" && xAmountMax && (
				<InfoItem
					heading={<span>Maximum spent after slippage ({slippage === "" ? "0" : slippage}%)</span>}
					value={`${xAmountMax.toHuman()} ${xToken!.symbol}`}
					tip="Is the maximum amount you may need to spend. However, if the price drops further, your transaction may fail."
				/>
			)}
			{estimatedFee && (
				<InfoItem
					heading="Gas Fee"
					value={`~${estimatedFee} ${gasToken.symbol}`}
					tip="Is the fee paid to the miners who process your transaction."
				/>
			)}
			{xAmount && (
				<>
					<InfoItem
						heading="Network Fee"
						value={`~${toFixed(+xAmount * (NETWORK_FEE_RATE / 100), 6)} ${xToken.symbol}`}
						tip="A fee of 0.05% of the swap amount is collected to reward ROOT stakers."
					/>
					<InfoItem
						heading="Swap fee"
						value={`~${toFixed(+xAmount * ((EXCHANGE_RATE - NETWORK_FEE_RATE) / 100), 6)} ${xToken.symbol}`}
						tip="A fee of 0.25% of the swap amount is collected to reward liquidity providers."
					/>
				</>
			)}
		</>
	);
};
