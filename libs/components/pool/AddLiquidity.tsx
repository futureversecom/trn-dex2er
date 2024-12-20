import { type PropsWithChildren } from "react";

import { type AddLiquidityContextType, useAddLiquidity } from "@/libs/context";
import { toFixed } from "@/libs/utils";

import {
	ActionButton,
	AmountInputs,
	Box,
	ConfirmModal,
	InfoItem,
	Ratio,
	SettingsButton,
	Text,
	TokenImage,
	TokenSelect,
} from "../shared";

export function AddLiquidity({ children }: PropsWithChildren) {
	const props = useAddLiquidity();

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
					title="Confirm Added liquidity"
					description=""
					explorerUrl={props.explorerUrl}
					error={props.error}
				>
					<InfoItem
						heading={
							<span className="flex items-center gap-2">
								<TokenImage symbol={props.xToken.symbol} />
								<Text size="md" className="!text-neutral-600">
									{props.xToken.symbol} deposit
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
									{props.yToken.symbol} deposit
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

			<Box heading={props.action === "add" ? "add liquidity" : "create pair"}>
				{children}

				<AmountInputs
					{...{
						plusIcon: true,
						labels: ["Deposit", "Deposit"],
						...props,
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
							<Ratio isSwitchable ratio={props.ratio} xToken={props.xToken} yToken={props.yToken} />

							<SettingsButton {...props} />
						</div>

						<div className="space-y-2 rounded-lg bg-neutral-400 p-6">{infoItems}</div>
					</>
				)}

				<ActionButton
					disabled={props.isDisabled || props.xAmount === "0" || props.yAmount === "0"}
					onClick={() => props.setTag("review")}
					text={props.action === "add" ? "add liquidity" : "create"}
				/>
			</Box>
		</>
	);
}

const getInfoItems = ({ estPoolShare, estimatedFee, gasToken }: AddLiquidityContextType) => {
	return (
		<>
			{estPoolShare && (
				<InfoItem heading="Estimated share of pool" value={`${toFixed(estPoolShare, 6)}%`} />
			)}
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
