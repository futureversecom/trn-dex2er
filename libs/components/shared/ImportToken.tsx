import { useCallback, useState } from "react";
import { isValidAddress } from "xrpl";

import { useXrplCurrencies } from "@/libs/context";
import { XrplCurrency } from "@/libs/types";
import { normalizeCurrencyCode } from "@/libs/utils";

import { Button } from "./";
import { Modal, type ModalProps, Text } from "./";

const currencyCodeRegex = /^([A-Za-z0-9]{3}|[A-Fa-f0-9]{40})$/;

export function ImportToken({ open, onClose }: ModalProps) {
	const { updateCurr, updateCurrError, importSuccess, setImportSuccess } = useXrplCurrencies();

	const [issuer, setIssuer] = useState<string>();
	const [currencyCode, setCurrencyCode] = useState<string>();
	const [issuerError, setIssuerError] = useState<string>();
	const [currencyCodeError, setCurrencyCodeError] = useState<string>();

	const isValidCurrencyCode = (currency: string) => currencyCodeRegex.test(currency);

	const resetState = useCallback(() => {
		setIssuer(undefined);
		setCurrencyCode(undefined);
		setIssuerError(undefined);
		setCurrencyCodeError(undefined);
		setImportSuccess(false);
	}, [setImportSuccess]);

	return (
		<Modal
			open={open}
			onClose={() => {
				onClose?.();
				resetState();
			}}
			heading="import a token"
		>
			{importSuccess ? (
				<div className="flex flex-col items-center gap-6">
					<svg width={56} height={56}>
						<use xlinkHref="/images/commons.svg#success" />
					</svg>
					{
						<Text variant="body" size="lg" className="font-semibold">
							Token Imported as: {normalizeCurrencyCode(currencyCode as string)}
						</Text>
					}
				</div>
			) : (
				<div className="relative flex max-h-[20em] flex-col space-y-2">
					<input
						id="currency-code"
						type="text"
						className="w-full overflow-x-hidden overflow-ellipsis rounded-md bg-neutral-100 px-4 py-2 pl-10 text-sm text-neutral-700"
						placeholder="currency code (case-sensitive"
						onChange={(e) => {
							console.log("currency-code ", e.target.value);
							if (isValidCurrencyCode(e.target.value)) {
								console.log("set currency code ", e.target.value);
								setCurrencyCode(e.target.value);
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
							console.log("issuer change ", e.target.value);
							if (isValidAddress(e.target.value)) {
								console.log("set valid address ", e.target.value);
								setIssuer(e.target.value);
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
						onClick={() =>
							currencyCode &&
							issuer &&
							updateCurr({
								currency: currencyCode,
								issuer: issuer,
								ticker: normalizeCurrencyCode(currencyCode),
							} as XrplCurrency)
						}
						disabled={
							currencyCodeError != undefined ||
							issuerError != undefined ||
							updateCurrError != undefined
						}
					>
						Import Token
					</Button>
					{updateCurrError && (
						<Text className="text-red-300" size="md">
							{updateCurrError}
						</Text>
					)}
				</div>
			)}

			{/* <div className="flex max-h-[20em] flex-col space-y-2 overflow-y-scroll"></div> */}
		</Modal>
	);
}
