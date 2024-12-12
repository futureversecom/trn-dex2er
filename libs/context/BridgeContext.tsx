import { useFutureverseSigner } from "@futureverse/auth-react";
import { CustomExtrinsicBuilder, TransactionBuilder } from "@futureverse/transact";
import { useTrnApi } from "@futureverse/transact-react";
import {
	createContext,
	type PropsWithChildren,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
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

import { DEFAULT_GAS_TOKEN, XRPL_BRIDGE_ADDRESS } from "../constants";
import { ROOT_NETWORK } from "../constants";
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
	const [canPayForGas, setCanPayForGas] = useState<boolean>();
	const builtTx = useRef<CustomExtrinsicBuilder>();

	//Adding network state to track network changes
	const [networkState, setNetworkState] = useState<"root" | "xrpl" | undefined>(undefined);

	const updateState = (update: Partial<BridgeState>) =>
		setState((prev) => ({ ...prev, ...update }));

	const resetState = () => setState(initialState);

	const setTag = useCallback((tag?: ContextTag) => updateState({ tag }), []);

	const setGasToken = useCallback((gasToken: TrnToken) => updateState({ gasToken }), []);

	const setBuilder = useCallback((builder: CustomExtrinsicBuilder) => updateState({ builder }), []);

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
	const signer = useFutureverseSigner();
	const { userSession } = useWallets();

	useMemo(() => {
		const execute = async () => {
			if (!state.builder || !userSession || network != "root") return;
			if (state.gasToken.assetId === DEFAULT_GAS_TOKEN.assetId) {
				// TODO 768 why doesn't this work ?
				try {
					await state.builder.addFuturePass(userSession.futurepass);
				} catch (err: any) {
					console.info(err);
				}
			} else {
				try {
					await state.builder.addFuturePassAndFeeProxy({
						futurePass: userSession.futurepass,
						assetId: state.gasToken.assetId,
						slippage: +state.slippage,
					});
				} catch (err: any) {
					console.info(err);
				}
			}

			builtTx.current = state.builder;

			const { gasString } = await state.builder.getGasFees();
			const [gas] = gasString.split(" ");
			setEstimatedFee(gas);

			const gasBalance = await state.builder.checkBalance({
				walletAddress: userSession.futurepass,
				assetId: state.gasToken.assetId,
			});
			const gasTokenBalance = new Balance(+gasBalance.balance, gasBalance);

			let canPay: boolean | undefined;

			// XRP ASSET ID
			if (state.gasToken.assetId === DEFAULT_GAS_TOKEN.assetId) {
				const total =
					(bridgeTokenInput.token as TrnToken).assetId === DEFAULT_GAS_TOKEN.assetId
						? +gas + +bridgeTokenInput.amount
						: 0;
				canPay = +gasTokenBalance.toUnit() > total;
			}

			// ROOT ASSET ID
			if (state.gasToken.assetId === 1) {
				const total =
					(bridgeTokenInput.token as TrnToken).assetId === 1 ? +gas + +bridgeTokenInput.amount : 0;
				canPay = +gasTokenBalance.toUnit() > total;
			}

			if (canPay === false) {
				updateState({ error: `Insufficient ${state.gasToken.symbol} balance for gas fee` });
			} else {
				updateState({ error: undefined });
			}

			setCanPayForGas(canPay);
		};

		execute();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [state.builder, userSession, state.gasToken]);

	const buildTransaction = useCallback(
		({ token, amount, toAddress }: { token?: Token; amount?: string; toAddress?: string }) => {
			if (!token || !amount || !toAddress || !signer || !userSession)
				return updateState({ builder: undefined, tx: undefined });

			if (network === "root") {
				if (!trnApi) return;

				const bridgeToken = token as TrnToken;

				const bridgeBalance = new Balance(amount, bridgeToken, false);

				const decoded = decodeAccountID(toAddress.trim());

				const decodedToAddress = `0x${convertStringToHex(decoded as any)}`;

				const tx = trnApi.tx.xrplBridge.withdraw(
					bridgeToken.assetId,
					bridgeBalance.toPlanckString(),
					decodedToAddress,
					null
				);

				const builder = TransactionBuilder.custom(trnApi, signer, userSession.eoa);
				const fromEx = builder.fromExtrinsic(tx);

				setBuilder(fromEx);
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
		[signer, userSession, network, xrplProvider, trnApi, setBuilder]
	);

	const signRootTransaction = useCallback(async () => {
		if (!builtTx.current) return;

		const onSend = () => {
			setTag("submitted");
		};

		try {
			const result = await builtTx.current.signAndSend({ onSend });
			if (!result) return setTag(undefined);

			updateState({
				explorerUrl: `${ROOT_NETWORK.ExplorerUrl}/extrinsic/${formatRootscanId(result.extrinsicId)}`,
			});
		} catch (err: any) {
			setTag("failed");
			updateState({
				error: err.message ?? err,
			});
		}
	}, [setTag]);

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
