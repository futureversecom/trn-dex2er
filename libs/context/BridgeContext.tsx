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
import {
	type Amount,
	convertStringToHex,
	decodeAccountID,
	type Payment,
	TrustSet,
	xrpToDrops,
} from "xrpl";

import { ContextTag, Token, TrnToken, XamanData, XrplCurrency } from "@/libs/types";

import { DEFAULT_GAS_TOKEN, ROOT_NETWORK, TRN_GAS_MARGIN, XRPL_BRIDGE_ADDRESS } from "../constants";
import {
	type BridgeTokenInput,
	type TrnTokenInputState,
	useBridgeDestinationInput,
	useBridgeTokenInput,
	useExtrinsic,
} from "../hooks";
import {
	Balance,
	formatRootscanId,
	getXrplExplorerUrl,
	type InteractiveTransactionResponse,
	isXrplCurrency,
	type IXrplWalletProvider,
} from "../utils";
import { useWallets } from "./WalletContext";
import { useXrplCurrencies } from "./XrplCurrencyContext";

export type BridgeContextType = {
	resetState: () => void;
	signTransaction: () => void;
	setTag: (tag?: ContextTag) => void;
	xamanData?: XamanData;
	setGasToken: (gasToken: TrnToken) => void;
	estimatedFee?: string;
	token?: Token;
	setToken: (token: Token) => void;
	isDisabled: boolean;
	destination: string;
	setDestination: (destination: string) => void;
	destinationError?: string;
	hasTrustline: boolean;
	tokenSymbol: string;
} & BridgeState &
	BridgeTokenInput;

const BridgeContext = createContext<BridgeContextType>({} as BridgeContextType);

interface BridgeState extends TrnTokenInputState {
	tx?: sdk.Extrinsic | Payment;
	gasToken: TrnToken;
	slippage: string;
	tag?: ContextTag;
	explorerUrl?: string;
	error?: string;
	feeError?: string;
	qr?: string;
}

const initialState = {
	slippage: "5",
	gasToken: DEFAULT_GAS_TOKEN,
} as BridgeState;

export function BridgeProvider({ children }: PropsWithChildren) {
	const [state, setState] = useState<BridgeState>(initialState);
	const [estimatedFee, setEstimatedFee] = useState<string>();

	//Adding network state to track network changes
	const [networkState, setNetworkState] = useState<"root" | "xrpl" | undefined>(undefined);

	const updateState = (update: Partial<BridgeState>) =>
		setState((prev) => ({ ...prev, ...update }));

	const resetState = () => setState(initialState);

	const setTag = useCallback((tag?: ContextTag) => updateState({ tag }), []);

	const setGasToken = useCallback((gasToken: TrnToken) => updateState({ gasToken }), []);

	const { network, xrplProvider } = useWallets();
	const { checkTrustline, refetch: refetchXrplBalances, findToken } = useXrplCurrencies();

	const { isDisabled: isTokenDisabled, ...bridgeTokenInput } = useBridgeTokenInput();
	const { error: destinationError, destination, setDestination } = useBridgeDestinationInput();

	const tokenSymbol = useMemo(() => {
		const token = bridgeTokenInput.token;
		if (!token) return "";

		if (isXrplCurrency(token)) return token.ticker || token.currency;

		return token.symbol;
	}, [bridgeTokenInput.token]);

	// Default to paying fee with the token selected to bridge
	useEffect(() => {
		if (network !== "root" || !bridgeTokenInput.token) return;

		setGasToken(bridgeTokenInput.token as TrnToken);
	}, [bridgeTokenInput.token, network, setGasToken]);

	const { trnApi } = useTrnApi();
	const { userSession } = useWallets();
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

	const buildTransaction = useCallback(
		({
			token,
			amount,
			toAddress,
			gasFee,
		}: {
			token?: Token;
			amount?: string;
			toAddress?: string;
			gasFee?: string;
		}) => {
			if (!token || !amount || !toAddress) return updateState({ tx: undefined });

			if (network === "root") {
				if (!trnApi) return;

				const bridgeToken = token as TrnToken;

				if (gasFee) {
					amount = (+amount - +gasFee * TRN_GAS_MARGIN).toString();
				}

				const bridgeBalance = new Balance(amount, bridgeToken, false);

				const decoded = decodeAccountID(toAddress.trim());

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
				const bridgeToken = token as XrplCurrency;

				let xrplAmount: Amount;
				if (bridgeToken.currency === "XRP") {
					xrplAmount = xrpToDrops(amount);
				} else {
					xrplAmount = {
						currency: bridgeToken.currency,
						value: amount,
						issuer: bridgeToken.issuer!,
					};
				}

				const tx: Payment = {
					Amount: xrplAmount,
					TransactionType: "Payment",
					Destination: XRPL_BRIDGE_ADDRESS,
					Account: xrplProvider.getAccount(),
					Memos: [
						{
							Memo: {
								MemoType: convertStringToHex("Address"),
								MemoData: convertStringToHex(toAddress),
							},
						},
					],
				};

				updateState({ tx });
			}
		},
		[trnApi, xrplProvider, network]
	);

	useEffect(() => {
		if (network !== "root" || !state.tx) return;

		estimateFee()
			.then((gasFee) => {
				const gas = new Balance(gasFee, state.gasToken).toHuman();
				setEstimatedFee(gas);
				buildTransaction({
					amount: bridgeTokenInput.amount,
					token: bridgeTokenInput.token,
					toAddress: destination,
					gasFee: gas,
				});
			})
			.catch(({ cause }: Error) => {
				if (!cause) return;

				updateState({
					gasToken: DEFAULT_GAS_TOKEN,
				});
			});
	}, [
		state.tx,
		state.gasToken,
		estimateFee,
		network,
		buildTransaction,
		bridgeTokenInput.amount,
		bridgeTokenInput.token,
		destination,
	]);

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
		async (
			provider?: IXrplWalletProvider,
			tx: Payment | TrustSet = state.tx as Payment | TrustSet
		) => {
			provider?.signTransaction(
				{ ...tx, Account: provider?.getAccount() },
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
							explorerUrl: `${getXrplExplorerUrl("Bridge")}/transactions/${response.hash}`,
						});
						refetchXrplBalances();
					} else {
						setTag("failed");
					}
				}
			);
		},
		[state, setTag, refetchXrplBalances]
	);

	const hasTrustline = useMemo(() => {
		if (network === "xrpl" || !tokenSymbol) return true;

		const currency = findToken(tokenSymbol);
		// TODO : handle this error
		if (!currency) throw new Error(`Currency not found for ${tokenSymbol}`);

		return checkTrustline(currency);
	}, [network, findToken, tokenSymbol, checkTrustline]);

	const signTransaction = useCallback(async () => {
		if (network === "root" && hasTrustline) return signRootTransaction();

		let trustSet: TrustSet | undefined;
		if (!hasTrustline) {
			const currency = findToken(tokenSymbol);
			if (!currency) throw new Error(`Currency not found for ${tokenSymbol}`);

			trustSet = {
				TransactionType: "TrustSet",
				LimitAmount: {
					issuer: currency.issuer,
					currency: currency.currency,
					value: "1000000",
				},
			} as TrustSet;
		}

		await signXrplTransaction(xrplProvider, trustSet);
	}, [
		network,
		hasTrustline,
		signRootTransaction,
		signXrplTransaction,
		xrplProvider,
		findToken,
		tokenSymbol,
	]);

	useEffect(() => {
		switch (xamanData?.progress) {
			case "onCreated":
				return setTag("sign");
			case "onSignatureSuccess":
				return setTag("submit");
		}
	}, [authenticationMethod?.method, xamanData?.progress, setTag]);

	const isDisabled = useMemo(
		() =>
			!hasTrustline
				? false
				: !!state.error || isTokenDisabled || !!destinationError || !!state.feeError,
		[state.error, isTokenDisabled, destinationError, state.feeError, hasTrustline]
	);

	const doSetToken = useCallback(
		(token?: Token) => {
			updateState({ error: undefined });
			bridgeTokenInput.setToken(token);
			buildTransaction({ token, amount: bridgeTokenInput.amount, toAddress: destination });
		},
		[bridgeTokenInput, destination, buildTransaction]
	);

	const doSetAmount = useCallback(
		(amount: string) => {
			updateState({ error: undefined });
			bridgeTokenInput.setAmount(amount);
			buildTransaction({ amount, token: bridgeTokenInput.token, toAddress: destination });
		},
		[bridgeTokenInput, destination, buildTransaction]
	);

	// Adding useMemo to track network changes and reset token and amount when network changes
	useMemo(() => {
		if (networkState !== network) {
			doSetToken(undefined);
			doSetAmount("");
			setNetworkState(network);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [network]);

	const doSetDestination = useCallback(
		(destination: string) => {
			setDestination(destination);
			buildTransaction({
				toAddress: destination,
				amount: bridgeTokenInput.amount,
				token: bridgeTokenInput.token,
			});
		},
		[bridgeTokenInput, setDestination, buildTransaction]
	);

	const error = useMemo(
		() => destinationError || bridgeTokenInput.tokenError || state.feeError || state.error,
		[destinationError, bridgeTokenInput, state]
	);

	return (
		<BridgeContext.Provider
			value={{
				resetState,
				setTag,
				setGasToken,

				xamanData,
				signTransaction,

				estimatedFee,

				isDisabled,
				hasTrustline,

				...state,

				...bridgeTokenInput,

				destination,
				setDestination: doSetDestination,
				destinationError,

				setToken: doSetToken,
				setAmount: doSetAmount,

				tokenSymbol,

				error,
			}}
		>
			{children}
		</BridgeContext.Provider>
	);
}

export function useBridge() {
	return useContext(BridgeContext);
}
