import * as sdk from "@futureverse/experience-sdk";
import {
	useAuthenticationMethod,
	useFuturePassAccountAddress,
	useTrnApi,
} from "@futureverse/react";
import { BN, hexToU8a } from "@polkadot/util";
import { useCallback, useMemo, useState } from "react";
import { useSigner } from "wagmi";

import { useTrnTokens } from "../context";
import type { XamanData } from "../types";

export function useExtrinsic({
	senderAddress,
	extrinsic,
	feeOptions,
}: {
	senderAddress?: string;
	extrinsic?: sdk.Extrinsic;
	feeOptions: {
		assetId: number;
		slippage?: number;
	};
}) {
	const { data: signer } = useSigner();
	const { refetchTokenBalances } = useTrnTokens();
	const { trnApi, createTrnDispatcher } = useTrnApi();
	const authenticationMethod = useAuthenticationMethod();
	const { data: futurePassAccount } = useFuturePassAccountAddress();

	const [xamanData, setXamanData] = useState<XamanData>();

	const setXamanProgress = (progress?: XamanData["progress"]) =>
		setXamanData((prev) => ({ ...prev, progress }));

	const dispatcher = useMemo(() => {
		try {
			if (!futurePassAccount || !signer || !senderAddress)
				throw new Error(
					`${
						!futurePassAccount ? "futurePassAccount" : !signer ? "signer" : "senderAddress"
					} was undefined`
				);

			return createTrnDispatcher({
				wrapWithFuturePass: sdk.addressEquals(senderAddress, futurePassAccount),
				feeOptions: {
					assetId: feeOptions.assetId,
					slippage: feeOptions?.slippage ?? 0.05,
				},
				wagmiOptions: {
					signer,
				},
				xamanOptions: {
					signMessageCallbacks: {
						onRejected: () => setXamanProgress(undefined),
						onCreated: (createdPayload) => {
							setXamanData({
								qrCodeImg: createdPayload.refs.qr_png,
								deeplink: createdPayload.next.always,
							});
							setXamanProgress("onCreated");
						},
					},
				},
				onSignatureSuccess:
					authenticationMethod?.method === "xaman"
						? () => {
								setXamanProgress("onSignatureSuccess");
							}
						: undefined,
			});
		} catch (err: any) {
			console.warn("Unable to create dispatcher:", err.message);
		}
	}, [
		authenticationMethod,
		createTrnDispatcher,
		futurePassAccount,
		senderAddress,
		signer,
		feeOptions,
	]);

	const submitExtrinsic = useCallback(
		async (newExtrinsic?: sdk.Extrinsic) => {
			if (!dispatcher || (!extrinsic && !newExtrinsic))
				throw new Error(
					`Unable to submit extrinsic: ${!dispatcher ? "dispatcher" : "extrinsic"} was undefined`
				);

			const result = await dispatcher.signAndSend((newExtrinsic ?? extrinsic)!);

			if (!result.ok) {
				const cause = result.value.cause as { code?: number };
				// User rejected tx
				if (cause.code === 4001) return;
				throw result.value;
			}

			const [executedEvent] = sdk.filterExtrinsicEvents(result.value.events, [
				"proxy.ProxyExecuted",
			]);

			if (!executedEvent || "err" in (executedEvent.data as any).result) {
				const { result } =
					(executedEvent?.data as { result: { err?: string | Record<string, unknown> } }) ?? {};

				if (!result.err) throw new Error("Error submitting extrinsic: unknown reason");

				if (typeof result.err === "string")
					throw new Error(`Error submitting extrinsic: ${result.err}`);

				if ("module" in result.err) {
					const errAsModule = result.err as { module: { index: string; error: string } };

					const { docs } = trnApi!.registry.findMetaError({
						index: new BN(errAsModule.module.index),
						error: hexToU8a(errAsModule.module.error),
					});

					throw new Error(`Error submitting extrinsic: ${docs}`);
				}

				throw new Error(`Error submitting extrinsic: ${JSON.stringify(result.err)}`);
			}

			setXamanProgress(undefined);
			void refetchTokenBalances();
			return result.value;
		},
		[dispatcher, extrinsic, trnApi, refetchTokenBalances]
	);

	const estimateFee = useCallback(
		async (newExtrinsic?: sdk.Extrinsic) => {
			if (!dispatcher || (!extrinsic && !newExtrinsic))
				throw new Error(
					`Unable to estimate fee: ${!dispatcher ? "dispatcher" : "extrinsic"} was undefined`
				);

			const result = await dispatcher.estimate((newExtrinsic ?? extrinsic)!, feeOptions.assetId);
			if (!result.ok) throw result.value;

			return result.value;
		},
		[dispatcher, extrinsic, feeOptions]
	);

	return {
		xamanData,
		estimateFee,
		submitExtrinsic,
	};
}
