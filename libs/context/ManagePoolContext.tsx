import { useFutureverseSigner } from "@futureverse/auth-react";
import { CustomExtrinsicBuilder, TransactionBuilder } from "@futureverse/transact";
import { useTrnApi } from "@futureverse/transact-react";
import BigNumber from "bignumber.js";
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
import { formatRootscanId } from "../utils";
import { Balance, getMinAmount, parseSlippage, toFixed } from "../utils";

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
	const builtTx = useRef<CustomExtrinsicBuilder>();

	const updateState = (update: Partial<ManagePoolState>) =>
		setState((prev) => ({ ...prev, ...update }));

	const setTag = useCallback((tag?: ContextTag) => updateState({ tag }), []);

	const setGasToken = useCallback((gasToken: TrnToken) => updateState({ gasToken }), []);

	const setToken = useCallback(({ src, token }: { src: TokenSource; token: TrnToken }) => {
		if (src === "x")
			return updateState({
				xToken: token,
				gasToken: token,
			});

		updateState({
			yToken: token,
		});
	}, []);

	const setBuilder = useCallback((builder: CustomExtrinsicBuilder) => updateState({ builder }), []);

	const { trnApi } = useTrnApi();
	const signer = useFutureverseSigner();
	const { userSession } = useWallets();
	const { getTokenBalance, pools, tokens, isFetching } = useTrnTokens();

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

	useEffect(() => {
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

	useMemo(() => {
		const execute = async () => {
			if (!state.builder || !userSession) return;
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
					state.xToken?.assetId === DEFAULT_GAS_TOKEN.assetId
						? +gas + +tokenInputs.xAmount
						: state.yToken?.assetId === DEFAULT_GAS_TOKEN.assetId
							? +gas + +tokenInputs.yAmount
							: 0;
				canPay = +gasTokenBalance.toUnit() > total;
			}

			// ROOT ASSET ID
			if (state.gasToken.assetId === 1) {
				const total =
					state.xToken?.assetId === 1
						? +gas + +tokenInputs.xAmount
						: state.yToken?.assetId === 1
							? +gas + +tokenInputs.yAmount
							: 0;
				canPay = +gasTokenBalance.toUnit() > total;
			}

			if (canPay === false) {
				updateState({ error: `Insufficient ${state.gasToken.symbol} balance for gas fee` });
			}
			setCanPayForGas(canPay);
		};

		execute();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [state.builder, userSession, state.gasToken]);

	const buildTransaction = useCallback(
		({
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
				!userSession
			)
				return;

			const xBalance = new Balance(xAmount, state.xToken, false);
			const yBalance = new Balance(yAmount, state.yToken, false);

			if (xBalance.eq(0) || yBalance.eq(0))
				return updateState({
					builder: undefined,
					ratio: undefined,
				});

			const xAmountMin = getMinAmount(xBalance, slippage);
			const yAmountMin = getMinAmount(yBalance, slippage);

			const builder = TransactionBuilder.custom(trnApi, signer, userSession.eoa);
			// let tx: SubmittableExtrinsic<"promise", ISubmittableResult>
			if (state.action === "add") {
				const tx = trnApi.tx.dex.addLiquidity(
					state.xToken.assetId,
					state.yToken.assetId,
					xBalance.toPlanckString(),
					yBalance.toPlanckString(),
					xAmountMin.toPlanckString(),
					yAmountMin.toPlanckString(),
					null,
					null
				);
				const fromEx = builder.fromExtrinsic(tx);
				return setBuilder(fromEx);
			}

			if (!state.position || !percentage) return;

			const position = state.position.lpBalance;
			const removeLiquidity = position.multipliedBy(percentage / 100).integerValue();

			const tx = trnApi.tx.dex.removeLiquidity(
				state.xToken.assetId,
				state.yToken.assetId,
				removeLiquidity.toPlanckString(),
				xBalance.toPlanckString(),
				yBalance.toPlanckString(),
				null,
				null
			);
			const fromEx = builder.fromExtrinsic(tx);
			setBuilder(fromEx);
		},
		[trnApi, state, tokenInputs, signer, userSession, setBuilder]
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
