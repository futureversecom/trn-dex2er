import { useFutureverseSigner } from "@futureverse/auth-react";
import { CustomExtrinsicBuilder } from "@futureverse/transact";
import { useTrnApi } from "@futureverse/transact-react";
import { useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import {
	createContext,
	type PropsWithChildren,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";

import type { ContextTag, TokenSource, TrnToken } from "@/libs/types";

import { useTrnTokens, useWallets } from ".";
import { DEFAULT_GAS_TOKEN, ROOT_NETWORK } from "../constants";
import { useCustomExtrinsicBuilder } from "../hooks";
import {
	type TrnTokenInputs,
	type TrnTokenInputState,
	useCheckValidPool,
	useTrnTokenInputs,
} from "../hooks";
import { Balance, formatRootscanId, getMinAmount, parseSlippage, toFixed } from "../utils";
import { createBuilder } from "../utils/createBuilder";

export type AddLiquidityContextType = {
	resetState: () => void;
	onPoolClick: (xToken: TrnToken, yToken: TrnToken) => void;
	setAmount: (args: { src: TokenSource; amount: string }) => void;
	setToken: (args: { src: TokenSource; token: TrnToken }) => void;
	setSlippage: (slippage: string) => void;
	ratio?: string;
	signTransaction: () => void;
	setTag: (tag?: ContextTag) => void;
	setGasToken: (gasToken: TrnToken) => void;
	estimatedFee?: string;
} & AddLiquidityState &
	Omit<TrnTokenInputs, "setXAmount" | "setYAmount">;

const AddLiquidityContext = createContext<AddLiquidityContextType>({} as AddLiquidityContextType);

interface AddLiquidityState extends TrnTokenInputState {
	builder?: CustomExtrinsicBuilder;
	gasToken: TrnToken;
	slippage: string;
	ratio?: string;
	tag?: ContextTag;
	explorerUrl?: string;
	error?: string;
	feeError?: string;
	estPoolShare?: number;
	ratioBase: TokenSource;
	action: "add" | "create";
}

const initialState = {
	slippage: "5",
	gasToken: DEFAULT_GAS_TOKEN,
	ratioBase: "x",
	action: "add",
} as AddLiquidityState;

export function AddLiquidityProvider({ children }: PropsWithChildren) {
	const [state, setState] = useState<AddLiquidityState>(initialState);
	const [estimatedFee, setEstimatedFee] = useState<string>();
	const [canPayForGas, setCanPayForGas] = useState<boolean>();
	const queryClient = useQueryClient();

	const pathname = usePathname();
	useEffect(() => {
		updateState({
			action: pathname.split("pool/")[1].split("/")[0] as AddLiquidityState["action"],
		});
	}, [pathname]);

	const updateState = (update: Partial<AddLiquidityState>) =>
		setState((prev) => ({ ...prev, ...update }));

	const setTag = useCallback((tag?: ContextTag) => updateState({ tag }), []);
	const setGasToken = useCallback((gasToken: TrnToken) => updateState({ gasToken, error: "" }), []);
	const setToken = useCallback(({ src, token }: { src: TokenSource; token: TrnToken }) => {
		if (src === "x")
			return updateState({
				xToken: token,
			});

		updateState({
			yToken: token,
		});
	}, []);
	const onPoolClick = useCallback((xToken: TrnToken, yToken: TrnToken) => {
		updateState({ xToken, yToken });
	}, []);

	const setBuilder = useCallback((builder: CustomExtrinsicBuilder) => updateState({ builder }), []);

	const {
		setXAmount,
		setYAmount,
		isDisabled: isTokenDisabled,
		...tokenInputs
	} = useTrnTokenInputs(state, setToken);

	const resetState = useCallback(() => {
		setState(initialState);
		setXAmount("");
		setYAmount("");
	}, [setXAmount, setYAmount]);

	const { trnApi } = useTrnApi();
	const { userSession } = useWallets();
	const { getTokenBalance, pools, refetchTokenBalances } = useTrnTokens();
	const signer = useFutureverseSigner();
	const customEx = useCustomExtrinsicBuilder({
		trnApi,
		walletAddress: userSession?.eoa ?? "",
		signer,
	});

	const liquidityPool = useMemo(() => {
		if (!state.xToken || !state.yToken) return;

		const xToken = state.xToken;
		const yToken = state.yToken;

		return pools.find(({ poolKey }) => {
			const [x, y] = poolKey.split("-").map(Number);

			return (
				(x === xToken.assetId && y === yToken.assetId) ||
				(x === yToken.assetId && y === xToken.assetId)
			);
		});
	}, [pools, state.xToken, state.yToken]);

	const getPoolBalances = useCallback(() => {
		if (!state.xToken || !state.yToken || !liquidityPool) return;

		const [x] = liquidityPool.poolKey.split("-");

		return {
			x: liquidityPool.liquidity[+x === state.xToken.assetId ? 0 : 1],
			y: liquidityPool.liquidity[+x === state.xToken.assetId ? 1 : 0],
		};
	}, [state.xToken, state.yToken, liquidityPool]);

	const buildTransaction = useCallback(
		async ({
			xAmount = tokenInputs.xAmount,
			yAmount = tokenInputs.yAmount,
			slippage = state.slippage,
		}: {
			xAmount?: string;
			yAmount?: string;
			slippage?: string;
		}) => {
			if (
				!trnApi ||
				!state.xToken ||
				!state.yToken ||
				!xAmount ||
				!yAmount ||
				!signer ||
				!userSession ||
				!customEx
			)
				return;

			const xBalance = new Balance(xAmount, state.xToken, false);
			const yBalance = new Balance(yAmount, state.yToken, false);

			if (xBalance.eq(0) || yBalance.eq(0))
				return updateState({
					ratio: undefined,
				});

			const xAmountMin = getMinAmount(xBalance, slippage);
			const yAmountMin = getMinAmount(yBalance, slippage);

			let tx = trnApi.tx.dex.addLiquidity(
				state.xToken.assetId,
				state.yToken.assetId,
				xBalance.toPlanckString(),
				yBalance.toPlanckString(),
				xAmountMin.toPlanckString(),
				yAmountMin.toPlanckString(),
				null,
				null
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

			const gasBalance = await builder.checkBalance({
				walletAddress: userSession.futurepass,
				assetId: state.gasToken.assetId,
			});

			let canPay: boolean | undefined;
			let xAmountWithoutGas: Balance<TrnToken> = xBalance;
			let yAmountWithoutGas: Balance<TrnToken> = yBalance;
			if (
				state.gasToken.assetId === state.xToken.assetId ||
				state.gasToken.assetId === state.yToken.assetId
			) {
				xAmountWithoutGas =
					state.xToken.assetId === DEFAULT_GAS_TOKEN.assetId
						? xBalance.toPlanck().minus(+gasFee * 1.5) // Safety margin for gas
						: xBalance;
				yAmountWithoutGas =
					state.yToken.assetId === DEFAULT_GAS_TOKEN.assetId
						? yBalance.toPlanck().minus(+gasFee * 1.5) // Safety margin for gas
						: yBalance;
				canPay =
					state.xToken.assetId === DEFAULT_GAS_TOKEN.assetId
						? xAmountWithoutGas.gte(0)
						: yAmountWithoutGas.gte(0);
			} else {
				canPay = new Balance(+gasBalance.balance, gasBalance).toUnit().toNumber() - +gas >= 0;
			}

			setCanPayForGas(canPay);
			if (!canPay) {
				return updateState({ error: `Insufficient ${state.gasToken.symbol} balance for gas fee` });
			}

			tx = trnApi.tx.dex.addLiquidity(
				state.xToken.assetId,
				state.yToken.assetId,
				xAmountWithoutGas.toPlanckString().split(".")[0],
				yAmountWithoutGas.toPlanckString().split(".")[0],
				xAmountMin.toPlanckString(),
				yAmountMin.toPlanckString(),
				null,
				null
			);

			builder = await createBuilder(
				userSession,
				state.gasToken.assetId,
				state.slippage,
				customEx,
				tx
			);

			setBuilder(builder);
		},
		[tokenInputs, state, trnApi, signer, userSession, setBuilder, customEx]
	);

	const setAmount = useCallback(
		({ src, amount }: { src: TokenSource; amount: string }) => {
			if (src === "x") setXAmount(amount);
			else setYAmount(amount);
			const otherSrc = src === "x" ? "y" : "x";

			const token = state[`${src}Token`];
			const otherToken = state[`${otherSrc}Token`];

			if (!token || !otherToken) return;

			const balance = new Balance(amount, token, false);

			if (balance.eq(0)) {
				setXAmount("");
				return setYAmount("");
			}

			if (state.action === "create") {
				const ratio =
					src === "x" && tokenInputs.yAmount
						? +tokenInputs.yAmount / balance.toNumber()
						: src === "y" && tokenInputs.xAmount
							? balance.div(tokenInputs.xAmount).toNumber()
							: 1;

				updateState({
					ratio: toFixed(ratio, 6),
					estPoolShare: 100,
				});

				return buildTransaction({
					[`${src}Amount`]: balance.toString(),
				});
			}

			const poolBalances = getPoolBalances();
			if (!poolBalances) return;

			const tokenLiquidity = new Balance(poolBalances[src], token).toUnit();
			const otherLiquidity = new Balance(poolBalances[otherSrc], otherToken).toUnit();

			const otherConverted = balance.multipliedBy(otherLiquidity.div(tokenLiquidity));

			const otherBalance = new Balance(otherConverted.toString(), otherToken, false);

			if (src === "x") setYAmount(otherBalance.toString());
			else setXAmount(otherBalance.toString());

			const xBalance = src === "x" ? balance : otherBalance;
			const yBalance = src === "y" ? balance : otherBalance;
			const ratio = toFixed(yBalance.toUnit().dividedBy(xBalance.toUnit()).toNumber(), 6);

			const estPoolShare = balance.div(tokenLiquidity.plus(balance)).multipliedBy(100).toNumber();

			updateState({
				ratio,
				estPoolShare,
			});

			buildTransaction({
				xAmount: xBalance.toString(),
				yAmount: yBalance.toString(),
			});
		},
		[state, buildTransaction, getPoolBalances, setXAmount, setYAmount, tokenInputs]
	);

	const setSlippage = useCallback(
		(slippage: string) => {
			const parsed = parseSlippage(slippage);

			if (typeof parsed !== "string") return;

			updateState({ slippage: parsed });
			buildTransaction({ slippage });
		},
		[buildTransaction]
	);

	const signTransaction = useCallback(async () => {
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

			void queryClient.invalidateQueries({
				queryKey: ["trnLiquidityPools"],
			});
			void queryClient.invalidateQueries({
				queryKey: ["tokenMetadata"],
			});
		} catch (err: any) {
			setTag("failed");
			updateState({
				error: err.message ?? err,
			});
		}
	}, [state.builder, setTag, queryClient, refetchTokenBalances]);

	const checkValidPool = useCheckValidPool();

	const isDisabled = useMemo(() => {
		if (state.tag === "sign") return true;

		return isTokenDisabled || !!state.error || canPayForGas === false;
	}, [state.tag, state.error, isTokenDisabled, canPayForGas]);

	useEffect(() => {
		if (!state.xToken || !state.yToken || !tokenInputs.xAmount) return;

		checkValidPool([state.xToken.assetId, state.yToken.assetId]).then((isValid) => {
			let error = "";

			if (state.action === "add" && !isValid)
				error = "This pair is not valid yet. Choose another token to deposit";
			if (state.action === "create" && isValid)
				error = "This pool already exists. Choose another token to deposit";

			updateState({ error });
		});
	}, [
		state.xToken,
		state.yToken,
		state.gasToken,
		estimatedFee,
		checkValidPool,
		getTokenBalance,
		tokenInputs.xAmount,
		state.action,
	]);

	return (
		<AddLiquidityContext.Provider
			value={{
				resetState,
				onPoolClick,

				setAmount,
				setToken,
				setTag,
				setSlippage,
				setGasToken,

				signTransaction,

				isDisabled,

				estimatedFee,

				...state,
				...tokenInputs,
			}}
		>
			{children}
		</AddLiquidityContext.Provider>
	);
}

export function useAddLiquidity() {
	return useContext(AddLiquidityContext);
}
