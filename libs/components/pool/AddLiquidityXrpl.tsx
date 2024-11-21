import { type PropsWithChildren } from "react";

import { useAddLiquidityXrpl } from "@/libs/context";

import {
	ActionButton,
	AmountInput,
	AmountInputs,
	Box,
	ConfirmModal,
	InfoItem,
	QrModal,
	Text,
	TokenImage,
	TokenSelect,
} from "../shared";

export function AddLiquidityXrpl({ children }: PropsWithChildren) {
	const props = useAddLiquidityXrpl();

	return (
		<>
			<TokenSelect
				open={props.isOpen !== false}
				onTokenClick={props.onTokenClick}
				onClose={() => props.setIsOpen(false)}
				tokens={Object.values(props.filteredTokens)}
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
					title="Confirm Added liquidity"
					description=""
					explorerUrl={props.explorerUrl}
					error={props.error}
				>
					<InfoItem
						heading={
							<span className="flex items-center gap-2">
								<TokenImage symbol={props.xToken.currency} />
								<Text size="md" className="!text-neutral-600">
									{props.xToken.currency} deposit
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
								<TokenImage symbol={props.yToken.currency} />
								<Text size="md" className="!text-neutral-600">
									{props.yToken.currency} deposit
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

				{props.action === "create" && (
					<AmountInput setAmount={props.setTradingFee} amount={props.tradingFee ?? "0.00"} />
				)}

				{props.ammExists && !props.ammExists && (
					<Text className="!text-neutral-600" size="md">
						Pool does not exist, Create it belows
					</Text>
				)}

				<ActionButton
					disabled={props.isDisabled}
					onClick={() => props.setTag("review")}
					text={props.action === "add" ? "add liquidity" : "create"}
				/>
			</Box>
		</>
	);
}
