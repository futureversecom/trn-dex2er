import * as sdk from "@futureverse/experience-sdk";
import { useAuthenticationMethod, useTrnApi } from "@futureverse/react";
import {
	createContext,
	type PropsWithChildren,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { Amount, convertStringToHex, decodeAccountID, Payment, xrpToDrops } from "xrpl";

import type { ContextTag, Token, TrnToken, XamanData, XrplCurrency } from "@/libs/types";

import { DEFAULT_GAS_TOKEN, ROOT_NETWORK, XRPL_BRIDGE_ADDRESS, XRPL_NETWORK } from "../constants";
import { type TrnTokenInputState, useAmountInput, useExtrinsic } from "../hooks";
import {
	Balance,
	formatRootscanId,
	InteractiveTransactionResponse,
	IXrplWalletProvider,
} from "../utils";
import { useTrnTokens } from "./TrnTokenContext";
import { useWallets } from "./WalletContext";

export type BridgeContextType = {
	resetState: () => void;
	setToken: (token: Token) => void;
	signTransaction: () => void;
	setTag: (tag?: ContextTag) => void;
	xamanData?: XamanData;
	setGasToken: (gasToken: TrnToken) => void;
	estimatedFee?: string;
	bridgeAmount?: string;
	setBridgeAmount: (amount: string) => void;
	isDisabled: boolean;
} & BridgeState;

const BridgeContext = createContext<BridgeContextType>({} as BridgeContextType);

interface BridgeState extends TrnTokenInputState {
	tx?: sdk.Extrinsic | Payment;
	gasToken: TrnToken;
	slippage: string;
	yAmountMin?: string;
	ratio?: string;
	tag?: ContextTag;
	explorerUrl?: string;
	error?: string;
	feeError?: string;
	priceDifference?: number;
	bridgeToken?: Token;
	toAddress?: string;
	qr?: string;
}

const initialState = {
	slippage: "5",
	xAmount: "",
	yAmount: "",
	gasToken: DEFAULT_GAS_TOKEN,
} as BridgeState;

export function BridgeProvider({ children }: PropsWithChildren) {
	const [state, setState] = useState<BridgeState>(initialState);
	const [estimatedFee, setEstimatedFee] = useState<string>();

	const updateState = (update: Partial<BridgeState>) =>
		setState((prev) => ({ ...prev, ...update }));

	const resetState = () => setState(initialState);

	const setTag = useCallback((tag?: ContextTag) => updateState({ tag }), []);

	const setGasToken = useCallback((gasToken: TrnToken) => updateState({ gasToken }), []);

	const { network, xrplProvider } = useWallets();

	const setToken = useCallback(
		(token: Token) => {
			return updateState({
				bridgeToken: token,
				...(network === "root" && { gasToken: token as TrnToken }),
			});
		},
		[network]
	);

	const {
		amount: bridgeAmount,
		setAmount: setBridgeAmount,
		error: bridgeTokenError,
	} = useAmountInput(state.bridgeToken);

	const { trnApi } = useTrnApi();
	const { userSession } = useWallets();
	const { getTokenBalance } = useTrnTokens();
	const authenticationMethod = useAuthenticationMethod();

	const futurepass = userSession?.futurepass as string | undefined;

	const { estimateFee, submitExtrinsic, xamanData } = useExtrinsic({
		extrinsic: state.tx as sdk.Extrinsic,
		senderAddress: futurepass,
		feeOptions: {
			assetId: state.gasToken.assetId,
			slippage: +state.slippage / 100,
		},
	});

	useEffect(() => {
		if (!state.tx) return;

		estimateFee()
			.then((gasFee) => setEstimatedFee(new Balance(gasFee, state.gasToken).toHuman()))
			.catch(({ cause }: Error) => {
				if (!cause) return;

				updateState({
					gasToken: DEFAULT_GAS_TOKEN,
				});
			});
	}, [state.tx, state.gasToken, estimateFee]);

	const buildTransaction = useCallback(() => {
		if (!bridgeAmount || !state.bridgeToken || !state.toAddress) return;

		if (network === "root") {
			if (!trnApi) return;

			const bridgeToken = state.bridgeToken as TrnToken;

			const bridgeBalance = new Balance(bridgeAmount, bridgeToken);

			const decoded = decodeAccountID(state.toAddress.trim());

			const decodedToAddress = `0x${convertStringToHex(decoded as any)}`;

			const tx = trnApi.tx.xrplBridge.withdraw(
				bridgeToken.assetId,
				bridgeBalance.toPlanckString(),
				decodedToAddress,
				null
			);

			updateState({ tx });
		}

		if (network === "xrpl" && xrplProvider) {
			const bridgeToken = state.bridgeToken as XrplCurrency;

			let amount: Amount;
			if (bridgeToken.currency === "XRP") {
				amount = xrpToDrops(bridgeAmount);
			} else {
				amount = {
					currency: bridgeToken.currency,
					value: bridgeAmount,
					issuer: bridgeToken.issuer!,
				};
			}

			const tx: Payment = {
				Amount: amount,
				TransactionType: "Payment",
				Destination: XRPL_BRIDGE_ADDRESS,
				Account: xrplProvider.getAccount(),
				Memos: [
					{
						Memo: {
							MemoType: convertStringToHex("Address"),
							MemoData: convertStringToHex(state.toAddress),
						},
					},
				],
			};

			updateState({ tx });
		}
	}, [trnApi, state, xrplProvider, network, bridgeAmount]);

	const setAmount = useCallback(
		(amount: string) => {
			setBridgeAmount(amount);

			buildTransaction();
		},
		[setBridgeAmount, buildTransaction]
	);

	const signRootTransaction = useCallback(async () => {
		if (!state.tx) return;

		try {
			const res = await submitExtrinsic(state.tx as sdk.Extrinsic);
			if (!res) return setTag(undefined);

			setTag("submitted");
			updateState({
				explorerUrl: `${ROOT_NETWORK.ExplorerUrl}/extrinsic/${formatRootscanId(res.extrinsicId)}`,
			});
		} catch (err: any) {
			setTag("failed");
			updateState({
				error: err.message ?? err,
			});
		}
	}, [state.tx, setTag, submitExtrinsic]);

	const signXrplTransaction = useCallback(
		async (provider?: IXrplWalletProvider) => {
			provider?.signTransaction(
				{ ...(state.tx as Payment), Account: provider?.getAccount() },
				(response: InteractiveTransactionResponse) => {
					if (response.status === "pending") {
						if (response.qrPng) {
							setTag("sign");
							updateState({
								qr: response.qrPng,
							});
						}
					} else if (response.status === "success") {
						setTag("submitted");
						updateState({
							explorerUrl: `${XRPL_NETWORK.ExplorerUrl}/transactions/${response.hash}`,
						});
					} else {
						setTag("failed");
					}
				}
			);
		},
		[state, setTag]
	);

	const signTransaction = useCallback(async () => {
		if (network === "root") return signRootTransaction();

		await signXrplTransaction(xrplProvider);
	}, [network, xrplProvider, signRootTransaction, signXrplTransaction]);

	useEffect(() => {
		switch (xamanData?.progress) {
			case "onCreated":
				return setTag("sign");
			case "onSignatureSuccess":
				return setTag("submit");
		}
	}, [authenticationMethod?.method, xamanData?.progress, setTag]);

	const isDisabled = useMemo(() => {
		if (state.tag === "sign") return true;

		return !!state.error || !!bridgeTokenError;
	}, [state, bridgeTokenError]);

	return (
		<BridgeContext.Provider
			value={{
				resetState,
				setToken,
				setTag,
				setGasToken,

				xamanData,
				signTransaction,

				isDisabled,

				estimatedFee,

				bridgeAmount,
				setBridgeAmount,

				...state,
			}}
		>
			{children}
		</BridgeContext.Provider>
	);
}

export function useBridge() {
	return useContext(BridgeContext);
}
