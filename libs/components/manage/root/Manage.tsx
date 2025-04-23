import { upperFirst } from "lodash";
import { useMemo } from "react";

import { type ManagePoolContextType, useManagePool } from "@/libs/context";
import { toFixed } from "@/libs/utils";

import {
	ActionButton,
	AmountInputs,
	Box,
	Button,
	ConfirmModal,
	ErrorMessage,
	InfoItem,
	Ratio,
	SettingsButton,
	Text,
	TokenImage,
	TokenSelect,
	YourPosition,
} from "../../shared";
import { PercentButtons } from "./PercentButtons";

export function Manage() {
	const poolManagementData = useManagePool();

	const { error, errorObj } = poolManagementData;
	const errorSeverity = errorObj?.severity || "error";

	const heading = useMemo(
		() => `${upperFirst(poolManagementData.action)} liquidity`,
		[poolManagementData.action]
	);

	const infoItems = getInfoItems(poolManagementData);

	return (
		<>
			<TokenSelect
				open={poolManagementData.isOpen !== false}
				onTokenClick={poolManagementData.onTokenClick}
				onClose={() => poolManagementData.setIsOpen(false)}
				tokens={Object.values(poolManagementData.filteredTokens)}
			/>

			{poolManagementData.xToken && poolManagementData.yToken && (
				<ConfirmModal
					tag={poolManagementData.tag}
					onClose={() => {
						poolManagementData.setTag(undefined);
						if (!poolManagementData.currentPosition) {
							poolManagementData.unSetTokens();
						}
					}}
					onConfirm={poolManagementData.signTransaction}
					title={`Confirm ${poolManagementData.action === "add" ? "added" : "removed"} liquidity`}
					description=""
					explorerUrl={poolManagementData.explorerUrl}
					error={error}
					errorSeverity={errorSeverity}
				>
					<InfoItem
						heading={
							<span className="flex items-center gap-2">
								<TokenImage symbol={poolManagementData.xToken.symbol} />
								<Text size="md" className="!text-neutral-600">
									{poolManagementData.xToken.symbol}{" "}
									{poolManagementData.action === "add" ? "deposit" : "withdrawal"}
								</Text>
							</span>
						}
						value={
							poolManagementData.xTokenUSD
								? `${poolManagementData.xAmount} ($${poolManagementData.xTokenUSD.toLocaleString("en-US")})`
								: poolManagementData.xAmount
						}
					/>

					<InfoItem
						heading={
							<span className="flex items-center gap-2">
								<TokenImage symbol={poolManagementData.yToken.symbol} />
								<Text size="md" className="!text-neutral-600">
									{poolManagementData.yToken.symbol}{" "}
									{poolManagementData.action === "add" ? "deposit" : "withdrawal"}
								</Text>
							</span>
						}
						value={
							poolManagementData.yTokenUSD
								? `${poolManagementData.yAmount} ($${poolManagementData.yTokenUSD.toLocaleString("en-US")})`
								: poolManagementData.yAmount
						}
					/>

					<div className="py-2">
						<hr className="border-neutral-600" />
					</div>

					{infoItems}
				</ConfirmModal>
			)}

			<div className="flex flex-col gap-4 md:flex-row">
				<Box heading={"I WOULD LIKE TO"}>
					<div className="flex space-x-4">
						<Button
							variant={poolManagementData.action === "add" ? "primary" : "secondary"}
							size="rounded"
							onClick={poolManagementData.onSwitchClick}
						>
							+ Add Liquidity
						</Button>
						<Button
							variant={poolManagementData.action === "add" ? "secondary" : "primary"}
							size="rounded"
							onClick={poolManagementData.onSwitchClick}
						>
							- Remove Liquidity
						</Button>
					</div>
					<div className="pb-8">
						{poolManagementData.action === "add" ? (
							<Text>
								By adding liquidity, you can earn 0.3% of all trades on this pair based on the
								amount of liquidity you provided. Fees are automatically added to the pool in
								real-time and can be claimed when you withdraw your liquidity.
							</Text>
						) : (
							<Text>
								When you remove liquidity, your position will be converted back into underlying
								tokens at the current rate, proportional to your share of the pool. Any fees that
								have accrued will be included in the amounts you receive.
							</Text>
						)}
					</div>

					<AmountInputs
						{...{
							xToken: poolManagementData.xToken,
							yToken: poolManagementData.yToken,
							labels: new Array(2).fill(
								poolManagementData.action === "add" ? "Deposit" : "Withdraw"
							) as [string, string],
							...poolManagementData,
							plusIcon: poolManagementData.action === "add",
							...(poolManagementData.action === "remove" && {
								between: <PercentButtons />,
								xTokenBalance: poolManagementData.poolBalances?.x.balance.toUnit(),
								yTokenBalance: poolManagementData.poolBalances?.y.balance.toUnit(),
								// TODO: Check for error properly for 'remove' action
								xTokenError: undefined,
								yTokenError: undefined,
							}),
						}}
					/>

					{error && <ErrorMessage message={error} severity={errorSeverity} />}

					{poolManagementData.xToken && poolManagementData.yToken && poolManagementData.ratio && (
						<>
							<div className="flex items-center justify-between px-2">
								<Ratio
									isSwitchable
									ratio={poolManagementData.ratio}
									xToken={poolManagementData.xToken}
									yToken={poolManagementData.yToken}
								/>

								<SettingsButton {...poolManagementData} />
							</div>

							<div className="space-y-2 rounded-lg bg-neutral-400 p-6">{infoItems}</div>
						</>
					)}

					<ActionButton
						disabled={
							poolManagementData.isDisabled ||
							poolManagementData.xAmount === "" ||
							poolManagementData.yAmount === "" ||
							(Boolean(error) && errorSeverity === "error")
						}
						onClick={() => poolManagementData.setTag("review")}
						text={heading}
					/>
				</Box>

				<div className="md:self-start">
					<YourPosition />
				</div>
			</div>
		</>
	);
}

const getInfoItems = ({
	estPoolShare,
	estimatedFee,
	gasToken,
	errorObj,
	action,
	slippage,
}: ManagePoolContextType) => {
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
			{slippage && (
				<InfoItem
					heading="Slippage Tolerance"
					value={`${slippage}%`}
					tip="Your transaction will revert if the price changes unfavorably by more than this percentage."
				/>
			)}
			{action === "remove" && errorObj?.type === "SLIPPAGE" && (
				<InfoItem
					heading="Slippage Warning"
					value="Consider increasing slippage tolerance in settings"
					className="text-yellow-300"
				/>
			)}
		</>
	);
};
