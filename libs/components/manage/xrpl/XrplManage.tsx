import { upperFirst } from "lodash";
import { useMemo } from "react";

import { useManageXrplPool } from "@/libs/context";
import { normalizeCurrencyCode } from "@/libs/utils";

import {
	ActionButton,
	AmountInputs,
	Box,
	Button,
	ConfirmModal,
	InfoItem,
	QrModal,
	Text,
	TokenImage,
	TokenSelect,
} from "../../shared";

export function XrplManage() {
	const props = useManageXrplPool();

	const heading = useMemo(() => `${upperFirst(props.action)} liquidity`, [props.action]);

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
					title={`Confirm ${props.action === "add" ? "added" : "removed"} liquidity`}
					description=""
					explorerUrl={props.explorerUrl}
					error={props.error}
				>
					<InfoItem
						heading={
							<span className="flex items-center gap-2">
								<TokenImage
									symbol={props.xToken.ticker || normalizeCurrencyCode(props.xToken.currency)}
								/>
								<Text size="md" className="!text-neutral-600">
									{props.xToken.ticker || normalizeCurrencyCode(props.xToken.currency)}{" "}
									{props.action === "add" ? "deposit" : "withdrawal"}
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
								<TokenImage
									symbol={props.yToken.ticker || normalizeCurrencyCode(props.yToken.currency)}
								/>
								<Text size="md" className="!text-neutral-600">
									{props.yToken.ticker || normalizeCurrencyCode(props.yToken.currency)}{" "}
									{props.action === "add" ? "deposit" : "withdrawal"}
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

			<Box heading={"I WOULD LIKE TO"} className="relative">
				<div className="flex space-x-4">
					<Button
						variant={props.action === "add" ? "primary" : "secondary"}
						size="rounded"
						onClick={props.onSwitchClick}
					>
						+ Add Liquidity
					</Button>
					<Button
						variant={props.action === "add" ? "secondary" : "primary"}
						size="rounded"
						onClick={props.onSwitchClick}
					>
						- Remove Liquidity
					</Button>
				</div>
				<div className="pb-8">
					{props.action === "add" ? (
						<Text>
							By adding liquidity, you can earn 0.3% of all trades on this pair based on the amount
							of liquidity you provided. Fees are automatically added to the pool in real-time and
							can be claimed when you withdraw your liquidity.
						</Text>
					) : (
						<Text>
							When you remove liquidity, your position will be converted back into underlying tokens
							at the current rate, proportional to your share of the pool. Any fees that have
							accrued will be included in the amounts you receive.
						</Text>
					)}
				</div>

				<AmountInputs
					{...{
						xToken: props.xToken,
						yToken: props.yToken,
						labels: new Array(2).fill(props.action === "add" ? "Deposit" : "Withdraw") as [
							string,
							string,
						],
						...props,
						plusIcon: props.action === "add",
						...(props.action === "remove" && {
							xTokenBalance: props.poolBalances?.x.balance.value,
							yTokenBalance: props.poolBalances?.y.balance.value,
							// TODO: Check for error properly for 'remove' action
							xTokenError: undefined,
							yTokenError: undefined,
						}),
					}}
				/>

				{props.error && (
					<Text className="text-red-300" size="md">
						{props.error}
					</Text>
				)}

				<ActionButton
					disabled={props.isDisabled}
					onClick={() => props.setTag("review")}
					text={heading}
				/>
			</Box>
		</>
	);
}
