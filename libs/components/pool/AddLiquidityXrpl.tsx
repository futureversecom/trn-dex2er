import Slider from "rc-slider";
import "rc-slider/assets/index.css";
import { type PropsWithChildren } from "react";

import { useAddLiquidityXrpl, useXrplCurrencies } from "@/libs/context";
import { normalizeCurrencyCode } from "@/libs/utils";

import {
	ActionButton,
	AmountInputs,
	Box,
	Button,
	ConfirmModal,
	ImportToken,
	InfoItem,
	QrModal,
	Text,
	TokenImage,
	TokenSelect,
} from "../shared";

export function AddLiquidityXrpl({ children }: PropsWithChildren) {
	const props = useAddLiquidityXrpl();
	const { openImportModal, importModalOpen } = useXrplCurrencies();

	return (
		<>
			<ImportToken
				open={props.isOpen === false && importModalOpen}
				onClose={() => {
					openImportModal(false);
				}}
			/>

			<TokenSelect
				open={props.isOpen !== false && importModalOpen === false}
				onTokenClick={props.onTokenClick}
				onClose={() => props.setIsOpen(false)}
				tokens={Object.values(props.filteredTokens)}
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
					title={
						props.action === "add" || props.action === "addSingle"
							? "Confirm Added liquidity"
							: "Confirm Create Pair"
					}
					description=""
					explorerUrl={props.explorerUrl}
					error={props.error}
				>
					<InfoItem
						heading={
							<span className="flex items-center gap-2">
								<TokenImage
									symbol={props.xToken.ticker || normalizeCurrencyCode(props.xToken.currency)}
									issuer={props.xToken.issuer}
								/>
								<Text size="md" className="!text-neutral-600">
									{props.xToken.ticker || normalizeCurrencyCode(props.xToken.currency)} deposit
								</Text>
							</span>
						}
						value={
							props.xTokenUSD
								? `${props.xAmount} ($${props.xTokenUSD.toLocaleString("en-US")})`
								: props.xAmount
						}
					/>

					{props.action != "addSingle" && (
						<InfoItem
							heading={
								<span className="flex items-center gap-2">
									<TokenImage
										symbol={props.yToken.ticker || normalizeCurrencyCode(props.yToken.currency)}
										issuer={props.yToken.issuer}
									/>
									<Text size="md" className="!text-neutral-600">
										{props.yToken.ticker || normalizeCurrencyCode(props.yToken.currency)} deposit
									</Text>
								</span>
							}
							value={
								props.yTokenUSD
									? `${props.yAmount} ($${props.yTokenUSD.toLocaleString("en-US")})`
									: props.yAmount
							}
						/>
					)}

					<div className="py-2">
						<hr className="border-neutral-600" />
					</div>
				</ConfirmModal>
			)}

			<Box
				heading={
					props.action === "add" || props.action === "addSingle" ? "add liquidity" : "create pair"
				}
			>
				{children}

				{props.action != "create" && (
					<Button
						variant={props.action === "add" ? "secondary" : "primary"}
						size="sm"
						onClick={() => props.toggleSingleAssetDeposit()}
					>
						Single Asset Deposit:{" "}
						{props.xToken?.ticker ?? normalizeCurrencyCode(props.xToken?.currency ?? "?")} -{" "}
						{props.yToken?.ticker ?? normalizeCurrencyCode(props.yToken?.currency ?? "?")}
					</Button>
				)}

				<AmountInputs
					{...{
						plusIcon: true,
						labels: ["Deposit", "Deposit"],
						singleSidedDeposit: props.action === "addSingle",
						...props,
					}}
				/>

				{props.error && (
					<Text className="text-red-300" size="md">
						{props.error}
					</Text>
				)}

				{props.action === "create" && (
					<>
						<Text className="!text-neutral-600" size="md">
							Select a trading fee value between 0 - 1 %
						</Text>
						<div className="w-96">
							<Slider
								value={Number(props.tradingFee ?? "0")}
								onChange={(value) => {
									props.setTradingFee(value as any);
								}}
								max={1}
								step={0.01}
								styles={{
									rail: {
										position: "absolute",
										width: "100%",
										height: "4px",
										backgroundColor: "#2e380b",
										borderRadius: "6px",
									},
									track: {
										position: "absolute",
										height: "4px",
										backgroundColor: "#d9f27e",
										borderRadius: "6px",
									},
									handle: {
										position: "absolute",
										width: "14px",
										height: "14px",
										marginTop: "-5px",
										backgroundColor: "#2e380b",
										boxShadow: "none",
										border: "solid 2px #d9f27e",
										borderRadius: "50%",
										cursor: "grab",
										opacity: "1",
										touchAction: "pan-x",
									},
								}}
							/>
						</div>
						<Text size="lg">{props.tradingFee ?? 0}%</Text>
						{props.tradingFeeError && (
							<Text className="text-red-300" size="md">
								{props.tradingFeeError}
							</Text>
						)}
					</>
				)}

				{props.ammExists && !props.ammExists && (
					<Text className="!text-neutral-600" size="md">
						Pool does not exist, Create it belows
					</Text>
				)}

				<ActionButton
					disabled={props.isDisabled}
					onClick={() => props.setTag("review")}
					text={props.action === "add" || props.action === "addSingle" ? "add liquidity" : "create"}
				/>
			</Box>
		</>
	);
}
