import { useState } from "react";
import { isValidAddress } from "xrpl";

import { useXrplCurrencies } from "@/libs/context";
import { normalizeCurrencyCode } from "@/libs/utils";

import { Button } from "./";
import { Modal, type ModalProps, QrModal, Text } from "./";

const currencyCodeRegex = /^([A-Za-z0-9]{3}|[A-Fa-f0-9]{40})$/;

export function ImportToken({ open, onClose }: ModalProps) {
	const props = useXrplCurrencies();

	const [issuerError, setIssuerError] = useState<string>();
	const [currencyCodeError, setCurrencyCodeError] = useState<string>();

	const isValidCurrencyCode = (currency: string) => currencyCodeRegex.test(currency);

	return props.tag === "sign" ? (
		<QrModal
			qr={props.qr}
			onClose={() => {
				onClose?.();
				props.resetState();
				setIssuerError(undefined);
				setCurrencyCodeError(undefined);
			}}
			open={!!props.qr && props.tag === "sign"}
		/>
	) : (
		<Modal
			open={open}
			onClose={() => {
				onClose?.();
				props.resetState();
				setIssuerError(undefined);
				setCurrencyCodeError(undefined);
			}}
			heading="import token"
		>
			{props.tag === "submitted" ? (
				<div className="flex flex-col items-center gap-6">
					<svg width={56} height={56}>
						<use xlinkHref="/images/commons.svg#success" />
					</svg>
					{
						<Text variant="body" size="lg" className="font-semibold">
							Token Imported: {normalizeCurrencyCode(props.currencyCode as string)}
						</Text>
					}
				</div>
			) : (
				<div className="relative flex max-h-[20em] flex-col space-y-2">
					<input
						id="currency-code"
						type="text"
						className="w-full overflow-x-hidden overflow-ellipsis rounded-md bg-neutral-100 px-4 py-2 pl-10 text-sm text-neutral-700"
						placeholder="currency code (case-sensitive)"
						onChange={(e) => {
							if (isValidCurrencyCode(e.target.value)) {
								props.setCurrencyCode(e.target.value);
								setCurrencyCodeError(undefined);
							} else {
								setCurrencyCodeError("Invalid currency code");
							}
						}}
					/>
					{currencyCodeError && (
						<Text className="text-red-300" size="md">
							currencyCodeError
						</Text>
					)}
					<input
						id="issuer-input"
						type="text"
						className="w-full overflow-x-hidden overflow-ellipsis rounded-md bg-neutral-100 px-4 py-2 pl-10 text-sm text-neutral-700"
						placeholder="input issuer address for token"
						onChange={(e) => {
							if (isValidAddress(e.target.value)) {
								props.setIssuer(e.target.value);
								setIssuerError(undefined);
							} else {
								setIssuerError("Invalid XRPL address");
							}
						}}
					/>
					{issuerError && (
						<Text className="text-red-300" size="md">
							issuerError
						</Text>
					)}
					<Button
						variant="secondary"
						size="sm"
						className="text-neutral-700"
						onClick={() => props.signTransaction()}
						disabled={
							currencyCodeError != undefined || issuerError != undefined || props.error != undefined
						}
					>
						Set Trust Line
					</Button>
					{props.error && (
						<Text className="text-red-300" size="md">
							{props.error}
						</Text>
					)}
					{props.info && (
						<Text className="!text-neutral-600" size="md">
							{props.info}
						</Text>
					)}
				</div>
			)}
		</Modal>
	);
}
