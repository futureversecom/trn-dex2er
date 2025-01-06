import { useFutureverseSigner } from "@futureverse/auth-react";
import { CustomExtrinsicBuilder } from "@futureverse/transact";
import { useTrnApi } from "@futureverse/transact-react";
import BigNumber from "bignumber.js";
import {
	createContext,
	type PropsWithChildren,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { Dispatch, SetStateAction } from "react";
import {
	type Amount,
	convertStringToHex,
	decodeAccountID,
	type Payment,
	TrustSet,
	xrpToDrops,
} from "xrpl";

import { ContextTag, Token, TrnToken, XamanData, XrplCurrency } from "@/libs/types";

import { DEFAULT_GAS_TOKEN, XRPL_BRIDGE_ADDRESS } from "../constants";
import { ROOT_NETWORK } from "../constants";
import { useCustomExtrinsicBuilder } from "../hooks";
import {
	type BridgeTokenInput,
	type TrnTokenInputState,
	useBridgeDestinationInput,
	useBridgeTokenInput,
} from "../hooks";
import {
	Balance,
	getXrplExplorerUrl,
	type InteractiveTransactionResponse,
	isXrplCurrency,
	type IXrplWalletProvider,
} from "../utils";
import { formatRootscanId } from "../utils";
import { createBuilder } from "../utils/createBuilder";
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
	destinationTag: string;
	setDestinationTag: Dispatch<SetStateAction<string>>;
} & BridgeState &
	Omit<BridgeTokenInput, "refetchTokenBalances">;

const BridgeContext = createContext<BridgeContextType>({} as BridgeContextType);

interface BridgeState extends TrnTokenInputState {
	builder?: CustomExtrinsicBuilder;
	tx?: Payment;
	gasToken: TrnToken;
	slippage: string;
	tag?: ContextTag;
	explorerUrl?: string;
	error?: string;
	qr?: string;
}

const initialState = {
	slippage: "5",
	gasToken: DEFAULT_GAS_TOKEN,
} as BridgeState;

export function BridgeProvider({ children }: PropsWithChildren) {
	const [state, setState] = useState<BridgeState>(initialState);
	const [estimatedFee, setEstimatedFee] = useState<string>();
	const [destinationTag, setDestinationTag] = useState<string>("");
	const [canPayForGas, setCanPayForGas] = useState<boolean>();
	const [networkState, setNetworkState] = useState<"root" | "xrpl" | undefined>(undefined);

	const updateState = (update: Partial<BridgeState>) =>
		setState((prev) => ({ ...prev, ...update }));

	const resetState = () => setState(initialState);

	const setTag = useCallback((tag?: ContextTag) => updateState({ tag }), []);
	const setGasToken = useCallback((gasToken: TrnToken) => updateState({ gasToken, error: "" }), []);
	const setBuilder = useCallback((builder: CustomExtrinsicBuilder) => updateState({ builder }), []);

	const { network, xrplProvider } = useWallets();
	const { checkTrustline, refetch: refetchXrplBalances, findToken } = useXrplCurrencies();

	const {
		isDisabled: isTokenDisabled,
		refetchTokenBalances,
		...bridgeTokenInput
	} = useBridgeTokenInput();
	const { error: destinationError, destination, setDestination } = useBridgeDestinationInput();

	const { trnApi } = useTrnApi();
	const { userSession } = useWallets();
	const signer = useFutureverseSigner();
	const customEx = useCustomExtrinsicBuilder({
		trnApi,
		walletAddress: userSession?.eoa ?? "",
		signer,
	});

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

	const buildTransaction = useCallback(
		async ({
			token,
			amount,
			toAddress,
		}: {
			token?: Token;
			amount?: string;
			toAddress?: string;
		}) => {
			if (!token || !amount || !toAddress || !signer || !userSession)
				return updateState({ builder: undefined, tx: undefined });

			if (network === "root") {
				if (!trnApi || !customEx) return;

				const bridgeToken = token as TrnToken;
				const bridgeBalance = new Balance(amount, bridgeToken, false);
				const decoded = decodeAccountID(toAddress.trim());
				const decodedToAddress = `0x${convertStringToHex(decoded as any)}`;

				let tx = trnApi.tx.xrplBridge.withdraw(
					bridgeToken.assetId,
					bridgeBalance.toPlanck().integerValue(BigNumber.ROUND_DOWN).toString(),
					decodedToAddress,
					destinationTag
				);

				let builder = await createBuilder(
					userSession,
					state.gasToken.assetId,
					state.slippage,
					customEx,
					tx
				);

				const { gasString, gasFee } = await builder.getGasFees();
				const [gas] = gasString.split(" ");
				setEstimatedFee(gas);

				const gasTokenBalance = await builder.checkBalance({
					walletAddress: userSession.futurepass,
					assetId: state.gasToken.assetId,
				});
				const gasBalance = new Balance(+gasTokenBalance.balance, gasTokenBalance)
					.toUnit()
					.toNumber();

				let canPay: boolean | undefined;
				let amountWithoutGas: Balance<TrnToken> = bridgeBalance;
				if (bridgeToken.assetId === state.gasToken.assetId) {
					amountWithoutGas = bridgeBalance.toPlanck().minus(+gasFee * 1.5); // Safety margin for gas
					canPay = amountWithoutGas.toUnit().toNumber() >= 0 ? true : false;
				} else {
					canPay = gasBalance - +gas >= 0;
				}

				setCanPayForGas(canPay);
				if (canPay === false) {
					return updateState({
						error: `Insufficient ${state.gasToken.symbol} balance for gas fee`,
					});
				} else {
					updateState({ error: "" });
				}

				console.log("destination tag ", destinationTag);
				tx = trnApi.tx.xrplBridge.withdraw(
					bridgeToken.assetId,
					amountWithoutGas.toPlanck().integerValue(BigNumber.ROUND_DOWN).toString(),
					decodedToAddress,
					destinationTag
				);

				builder = await createBuilder(
					userSession,
					state.gasToken.assetId,
					state.slippage,
					customEx,
					tx
				);

				setBuilder(builder);
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
		[
			signer,
			userSession,
			network,
			xrplProvider,
			trnApi,
			customEx,
			state.gasToken.assetId,
			state.gasToken.symbol,
			state.slippage,
			setBuilder,
			destinationTag,
		]
	);

	const signRootTransaction = useCallback(async () => {
		if (!state.builder) return;

		try {
			const result = await state.builder.signAndSend({
				onSign: () => {
					setTag("submit");
				},
				onSend: () => {
					setTag("submitted");
				},
			});
			if (!result) return setTag(undefined);

			refetchTokenBalances();

			updateState({
				explorerUrl: `${ROOT_NETWORK.ExplorerUrl}/extrinsic/${formatRootscanId(result.extrinsicId)}`,
			});
		} catch (err: any) {
			setTag("failed");
			updateState({
				error: err.message ?? err,
			});
		}
	}, [setTag, state.builder, refetchTokenBalances]);

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
		if (network === "xrpl" || !xrplProvider || !tokenSymbol) return true;

		const currency = findToken(tokenSymbol);
		// TODO : handle this error
		if (!currency) throw new Error(`Currency not found for ${tokenSymbol}`);

		return checkTrustline(currency);
	}, [network, xrplProvider, findToken, tokenSymbol, checkTrustline]);

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

	const isDisabled = useMemo(
		() =>
			!hasTrustline
				? false
				: !!state.error || isTokenDisabled || !!destinationError || canPayForGas === false,
		[state.error, isTokenDisabled, destinationError, hasTrustline, canPayForGas]
	);

	const doSetToken = useCallback(
		(token?: Token) => {
			bridgeTokenInput.setToken(token);
			buildTransaction({ token, amount: bridgeTokenInput.amount, toAddress: destination });
		},
		[bridgeTokenInput, destination, buildTransaction]
	);

	const doSetAmount = useCallback(
		(amount: string) => {
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

	return (
		<BridgeContext.Provider
			value={{
				resetState,
				setTag,
				setGasToken,
				destinationTag,
				setDestinationTag,

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
			}}
		>
			{children}
		</BridgeContext.Provider>
	);
}

export function useBridge() {
	return useContext(BridgeContext);
}
