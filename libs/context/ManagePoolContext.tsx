import { useFutureverseSigner } from "@futureverse/auth-react";
import { CustomExtrinsicBuilder } from "@futureverse/transact";
import { useTrnApi } from "@futureverse/transact-react";
import { SubmittableExtrinsic } from "@polkadot/api/types";
import { ISubmittableResult } from "@polkadot/types/types";
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

import type { ContextTag, TokenSource, TrnToken, XamanData } from "@/libs/types";

import { useTrnTokens, useWallets } from ".";
import { ROOT_NETWORK } from "../constants";
import { DEFAULT_GAS_TOKEN } from "../constants";
import {
	type TrnTokenInputs,
	type TrnTokenInputState,
	useCheckValidPool,
	useTrnTokenInputs,
} from "../hooks";
import { useCustomExtrinsicBuilder } from "../hooks";
import { formatRootscanId } from "../utils";
import { Balance, getMinAmount, parseSlippage, toFixed } from "../utils";
import { createBuilder } from "../utils/createBuilder";

interface Position {
	assetId: number;
	xToken: TrnToken;
	yToken: TrnToken;
	lpBalance: Balance<TrnToken>;
	poolShare: BigNumber;
}

interface PoolBalance {
	balance: Balance<TrnToken>;
	liquidity: Balance<TrnToken>;
}

interface PoolBalances {
	x: PoolBalance;
	y: PoolBalance;
}

export type ManagePoolContextType = {
	resetState: () => void;
	onPoolClick: (xToken: TrnToken, yToken: TrnToken) => void;
	onSwitchClick: () => void;
	setPercentage: (percentage: number) => void;
	estimatedFee?: string;
	setGasToken: (token: TrnToken) => void;
	setSlippage: (slippage: string) => void;
	setAmount: (args: { src: TokenSource; amount: string }) => void;
	signTransaction: () => Promise<void>;
	setTag: (tag?: ContextTag) => void;
	positions: Array<Position>;
	poolBalances?: PoolBalances;
	xamanData?: XamanData;
} & ManagePoolState &
	Omit<TrnTokenInputs, "setXAmount" | "setYAmount">;

interface ManagePoolState extends TrnTokenInputState {
	builder?: CustomExtrinsicBuilder;
	action: "add" | "remove";
	gasToken: TrnToken;
	percentage?: number;
	slippage: string;
	tag?: ContextTag;
	error?: string;
	explorerUrl?: string;
	ratio?: string;
	position?: Position;
	estPoolShare?: number;
}

const ManagePoolContext = createContext<ManagePoolContextType>({} as ManagePoolContextType);

const initialState: ManagePoolState = {
	action: "add",
	gasToken: DEFAULT_GAS_TOKEN,
	slippage: "5",
	percentage: undefined,
};

export function ManagePoolProvider({ children }: PropsWithChildren) {
	const [state, setState] = useState<ManagePoolState>(initialState);
	const [estimatedFee, setEstimatedFee] = useState<string>();
	const [canPayForGas, setCanPayForGas] = useState<boolean>();
	// const builtTx = useRef<CustomExtrinsicBuilder>();

	const updateState = (update: Partial<ManagePoolState>) =>
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

	const setBuilder = useCallback((builder: CustomExtrinsicBuilder) => updateState({ builder }), []);

	const { trnApi } = useTrnApi();
	const { userSession } = useWallets();
	const { getTokenBalance, pools, tokens, isFetching } = useTrnTokens();
	const signer = useFutureverseSigner();
	const customEx = useCustomExtrinsicBuilder({
		trnApi,
		walletAddress: userSession?.eoa ?? "",
		signer,
	});

	const positions = useMemo(() => {
		if (!pools || !tokens || isFetching) return [];

		return pools
			.sort((a, b) => (a.assetId > b.assetId ? 1 : -1))
			.map((pool) => {
				const lpToken = tokens[pool.assetId as number];
				const lpBalance = getTokenBalance(lpToken);

				if (!lpToken || !lpBalance || lpBalance.eq(0)) return null;

				const poolShare = lpBalance.div(lpToken.supply).multipliedBy(100);

				const [xAssetId, yAssetId] = pool.poolKey.split("-").map(Number);
				const xToken = tokens[xAssetId];
				const yToken = tokens[yAssetId];

				return {
					assetId: pool.assetId,
					xToken,
					yToken,
					lpBalance,
					poolShare,
				};
			})
			.filter((pool): pool is Position => !!pool);
	}, [pools, tokens, isFetching, getTokenBalance]);

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

	useMemo(() => {
		if (!liquidityPool || !positions.length || isFetching) return;

		const position = positions.find((pos) => pos.assetId === liquidityPool.assetId);

		updateState({ position });
	}, [positions, liquidityPool, isFetching]);

	const poolBalances = useMemo(() => {
		if (!state.xToken || !state.yToken || !state.position || !liquidityPool || isFetching) return;

		const [x] = liquidityPool.poolKey.split("-");

		const poolShare = state.position.poolShare.dividedBy(100);

		const xLiquidity = new Balance(
			liquidityPool.liquidity[+x === state.xToken.assetId ? 0 : 1],
			state.xToken
		);
		const yLiquidity = new Balance(
			liquidityPool.liquidity[+x === state.xToken.assetId ? 1 : 0],
			state.yToken
		);

		const xBalance = xLiquidity.multipliedBy(poolShare);
		const yBalance = yLiquidity.multipliedBy(poolShare);

		return {
			x: {
				balance: xBalance,
				liquidity: xLiquidity,
			},
			y: {
				balance: yBalance,
				liquidity: yLiquidity,
			},
		};
	}, [state.xToken, state.yToken, state.position, liquidityPool, isFetching]);

	const {
		setXAmount,
		setYAmount,
		isDisabled: isTokenDisabled,
		...tokenInputs
	} = useTrnTokenInputs(state, setToken, state.action === "remove" ? poolBalances : undefined);

	const resetState = useCallback(() => {
		setState(initialState);
		setXAmount("");
		setYAmount("");
	}, [setXAmount, setYAmount]);

	// useEffect(() => {
	// 	switch (xamanData?.progress) {
	// 		case "onCreated":
	// 			return setTag("sign");
	// 		case "onSignatureSuccess":
	// 			return setTag("submit");
	// 	}
	// }, [authenticationMethod?.method, xamanData?.progress, setTag]);

	const isDisabled = useMemo(() => {
		if (state.tag === "sign") return true;

		return isTokenDisabled || !!state.error || canPayForGas === false;
	}, [state, isTokenDisabled, canPayForGas]);

	const onPoolClick = useCallback((xToken: TrnToken, yToken: TrnToken) => {
		updateState({ xToken, yToken });
	}, []);

	const onSwitchClick = useCallback(() => {
		updateState({ action: state.action === "add" ? "remove" : "add" });
	}, [state.action]);

	const buildTransaction = useCallback(
		async ({
			xAmount = tokenInputs.xAmount,
			yAmount = tokenInputs.yAmount,
			slippage = state.slippage,
			percentage = state.percentage,
		}: {
			xAmount?: string;
			yAmount?: string;
			slippage?: string;
			percentage?: number;
		}) => {
			if (
				!trnApi ||
				!state.xToken ||
				!state.yToken ||
				!xAmount ||
				!yAmount ||
				!signer ||
				!userSession ||
				!state.position ||
				!percentage ||
				!customEx
			)
				return;

			const xBalance = new Balance(xAmount, state.xToken, false);
			const yBalance = new Balance(yAmount, state.yToken, false);

			if (xBalance.eq(0) || yBalance.eq(0))
				return updateState({
					builder: undefined,
					ratio: undefined,
				});

			const xAmountMin = getMinAmount(xBalance, slippage).toNumber();
			const yAmountMin = getMinAmount(yBalance, slippage).toNumber();

			const xAmountMinBalance = new Balance(xAmountMin, state.xToken, false);
			const yAmountMinBalance = new Balance(yAmountMin, state.yToken, false);

			const position = state.position.lpBalance;
			const removeLiquidity = position.multipliedBy(percentage / 100).integerValue();

			let tx: SubmittableExtrinsic<"promise", ISubmittableResult>;
			if (state.action === "add") {
				tx = trnApi.tx.dex.addLiquidity(
					state.xToken.assetId,
					state.yToken.assetId,
					xBalance.toPlanckString(),
					yBalance.toPlanckString(),
					xAmountMinBalance.toPlanckString(),
					yAmountMinBalance.toPlanckString(),
					null,
					null
				);
			} else {
				tx = trnApi.tx.dex.removeLiquidity(
					state.xToken.assetId,
					state.yToken.assetId,
					removeLiquidity.toPlanckString(),
					xAmountMinBalance.toPlanckString(),
					yAmountMinBalance.toPlanckString(),
					null,
					null
				);
			}

			let builder = await createBuilder(
				userSession,
				state.gasToken.assetId,
				state.slippage,
				customEx,
				tx
			);

			const { gasString } = await builder.getGasFees();
			const [gas] = gasString.split(" ");
			setEstimatedFee(gas);

			const gasTokenBalance = await builder.checkBalance({
				walletAddress: userSession.futurepass,
				assetId: state.gasToken.assetId,
			});
			const gasBalance = new Balance(+gasTokenBalance.balance, gasTokenBalance).toUnit().toNumber();

			let canPay: boolean | undefined;
			let xAmountWithoutGas: number = xBalance.toNumber();
			let yAmountWithoutGas: number = yBalance.toNumber();
			if (
				(state.xToken.assetId === state.gasToken.assetId ||
					state.yToken.assetId === state.gasToken.assetId) &&
				state.action === "add"
			) {
				xAmountWithoutGas =
					state.xToken.assetId === state.gasToken.assetId
						? +xAmount - +gas * 1.5 // Safety margin for gas
						: xBalance.toNumber();
				yAmountWithoutGas =
					state.yToken.assetId === state.gasToken.assetId
						? +yAmount - +gas * 1.5 // Safety margin for gas
						: yBalance.toNumber();
				canPay =
					state.xToken.assetId === state.gasToken.assetId
						? gasBalance > xAmountWithoutGas
						: gasBalance > yAmountWithoutGas;
			} else {
				canPay = gasBalance - +gas >= 0;
			}

			setCanPayForGas(canPay);
			if (canPay === false) {
				return updateState({ error: `Insufficient ${state.gasToken.symbol} balance for gas fee` });
			} else {
				updateState({ error: "" });
			}

			const xb = new Balance(xAmountWithoutGas, state.xToken, false);
			const yb = new Balance(yAmountWithoutGas, state.yToken, false);

			if (state.action === "add") {
				tx = trnApi.tx.dex.addLiquidity(
					state.xToken.assetId,
					state.yToken.assetId,
					xb.toPlanckString(),
					yb.toPlanckString(),
					xAmountMinBalance.toPlanckString(),
					yAmountMinBalance.toPlanckString(),
					null,
					null
				);
			} else {
				tx = trnApi.tx.dex.removeLiquidity(
					state.xToken.assetId,
					state.yToken.assetId,
					removeLiquidity.toPlanckString(),
					xAmountMinBalance.toPlanckString(),
					yAmountMinBalance.toPlanckString(),
					null,
					null
				);
			}

			builder = await createBuilder(
				userSession,
				state.gasToken.assetId,
				state.slippage,
				customEx,
				tx
			);

			setBuilder(builder);
		},
		[
			tokenInputs.xAmount,
			tokenInputs.yAmount,
			state.slippage,
			state.percentage,
			state.xToken,
			state.yToken,
			state.position,
			state.action,
			state.gasToken.assetId,
			state.gasToken.symbol,
			trnApi,
			signer,
			userSession,
			customEx,
			setBuilder,
		]
	);

	const setAmount = useCallback(
		({ src, amount }: { src: TokenSource; amount: string }) => {
			const otherSrc = src === "x" ? "y" : "x";
			const token = state[`${src}Token`];
			const otherToken = state[`${otherSrc}Token`];

			if (!token || !otherToken || !poolBalances) return;

			const balance = new Balance(amount, token, false);

			if (balance.eq(0)) {
				setXAmount("0");
				setYAmount("0");
				return updateState({ percentage: 0 });
			}

			if (state.action === "remove" && balance.gt(poolBalances[src].balance.toUnit())) {
				setXAmount(poolBalances[src === "x" ? src : otherSrc].balance.toUnit().toString());
				setYAmount(poolBalances[src === "x" ? otherSrc : src].balance.toUnit().toString());
				return updateState({ percentage: 100 });
			}

			const tokenLiquidity = new Balance(poolBalances[src].liquidity, token).toUnit();
			const otherLiquidity = new Balance(poolBalances[otherSrc].liquidity, otherToken).toUnit();

			const otherConverted = balance.multipliedBy(otherLiquidity.div(tokenLiquidity));

			const otherBalance = new Balance(otherConverted.toString(), otherToken, false);

			if (src === "x") {
				setXAmount(balance.toString());
				setYAmount(otherBalance.toString());
			} else {
				setXAmount(otherBalance.toString());
				setYAmount(balance.toString());
			}

			const xBalance = src === "x" ? balance : otherBalance;
			const yBalance = src === "y" ? balance : otherBalance;
			const ratio = toFixed(yBalance.dividedBy(xBalance).toNumber(), 6);

			const estPoolShare = balance
				.div(tokenLiquidity[state.action === "add" ? "plus" : "minus"](balance))
				.multipliedBy(100)
				.toNumber();
			const percentage = xBalance
				.dividedBy(poolBalances.x.balance.toUnit())
				.multipliedBy(100)
				.toNumber();

			updateState({
				ratio,
				estPoolShare,
				percentage: +toFixed(percentage, 1),
			});

			buildTransaction({
				percentage,
				xAmount: xBalance.toString(),
				yAmount: yBalance.toString(),
			});
		},
		[state, buildTransaction, poolBalances, setXAmount, setYAmount]
	);

	const setPercentage = useCallback(
		(percentage: number) => {
			if (!poolBalances) return;

			const xBalance = poolBalances.x.balance.toUnit();

			const xAmount = xBalance.multipliedBy(percentage / 100).toString();

			setAmount({ src: "x", amount: xAmount });
		},
		[poolBalances, setAmount]
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

			updateState({
				explorerUrl: `${ROOT_NETWORK.ExplorerUrl}/extrinsic/${formatRootscanId(result.extrinsicId)}`,
			});
		} catch (err: any) {
			setTag("failed");
			updateState({
				error: err.message ?? err,
			});
		}
	}, [setTag, state.builder]);

	const checkValidPool = useCheckValidPool();

	useEffect(() => {
		if (!state.xToken || !state.yToken || !tokenInputs.xAmount) return;

		checkValidPool([state.xToken.assetId, state.yToken.assetId]).then((isValid) => {
			let error = "";

			if (!isValid) error = "This pair is not valid yet. Choose another token to deposit";

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

	// Rebuild tx on action change
	useEffect(() => {
		buildTransaction({});
	}, [buildTransaction, state.action]);

	return (
		<ManagePoolContext.Provider
			value={{
				resetState,
				onPoolClick,

				onSwitchClick,
				setPercentage,

				estimatedFee,
				setSlippage,
				setGasToken,
				setTag,
				setAmount,

				isDisabled,
				signTransaction,

				positions,

				poolBalances,

				// xamanData,

				...state,
				...tokenInputs,
			}}
		>
			{children}
		</ManagePoolContext.Provider>
	);
}

export function useManagePool() {
	return useContext(ManagePoolContext);
}
