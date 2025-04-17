import { useFutureverseSigner } from "@futureverse/auth-react";
import { CustomExtrinsicBuilder } from "@futureverse/transact";
import { useTrnApi } from "@futureverse/transact-react";
import { SubmittableExtrinsic } from "@polkadot/api/types";
import { ISubmittableResult } from "@polkadot/types/types";
import { useQueryClient } from "@tanstack/react-query";
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
import { fetchSingleTrnToken, formatRootscanId } from "../utils";
import { Balance, getMinAmount, parseSlippage, toFixed } from "../utils";
import { createBuilder } from "../utils/createBuilder";
import { Position } from "./TrnTokenContext";

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
	unSetTokens: () => void;
	positions: Array<Position>;
	currentPosition?: Position;
	isLoadingPositions: boolean;
	xamanData?: XamanData;
	isFetchingPools: boolean;
} & ManagePoolState &
	Omit<TrnTokenInputs, "setXAmount" | "setYAmount" | "refetchTokenBalances">;

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
	lpToRemove?: Balance<TrnToken>;
	poolBalances?: PoolBalances;
}

const ManagePoolContext = createContext<ManagePoolContextType>({} as ManagePoolContextType);

const initialState: ManagePoolState = {
	action: "add",
	gasToken: DEFAULT_GAS_TOKEN,
	slippage: "5",
	percentage: undefined,
	lpToRemove: undefined,
};

function useManagePoolState() {
	const [state, setState] = useState<ManagePoolState>(initialState);
	const [estimatedFee, setEstimatedFee] = useState<string>();
	const [canPayForGas, setCanPayForGas] = useState<boolean>();
	const [positions, setPositions] = useState<Position[]>([]);
	const [isLoadingPositions, setIsLoadingPositions] = useState(false);
	const updateState = useCallback((update: Partial<ManagePoolState>) => {
		setState((prev) => ({ ...prev, ...update }));
	}, []);

	const setTag = useCallback((tag?: ContextTag) => updateState({ tag }), [updateState]);
	const setGasToken = useCallback(
		(gasToken: TrnToken) => updateState({ gasToken, error: "" }),
		[updateState]
	);
	const setToken = useCallback(
		({ src, token }: { src: TokenSource; token: TrnToken }) => {
			if (src === "x") return updateState({ xToken: token });
			updateState({ yToken: token });
		},
		[updateState]
	);
	const setBuilder = useCallback(
		(builder?: CustomExtrinsicBuilder) => updateState({ builder }),
		[updateState]
	);
	const setPoolBalances = useCallback(
		(poolBalances?: PoolBalances) => updateState({ poolBalances }),
		[updateState]
	);
	const unSetTokens = useCallback(
		() => updateState({ xToken: undefined, yToken: undefined }),
		[updateState]
	);

	const queryClient = useQueryClient();
	const { trnApi } = useTrnApi();
	const { userSession } = useWallets();
	const {
		getTokenBalance,
		pools,
		tokens,
		isFetching,
		refetchTokenBalances: refetchTrnTokenBalances,
	} = useTrnTokens();
	const signer = useFutureverseSigner();
	const customEx = useCustomExtrinsicBuilder({
		trnApi,
		walletAddress: userSession?.eoa ?? "",
		signer,
	});

	// Effect to fetch and calculate user's liquidity positions
	// -------------------------------------------------------
	// Runs when pools or tokens data updates
	useEffect(() => {
		if (!pools || !tokens || isFetching) {
			return;
		}

		let isMounted = true;
		setIsLoadingPositions(true);

		const fetchPositions = async () => {
			try {
				const sortedPools = [...pools].sort((a, b) => (a.assetId > b.assetId ? 1 : -1));

				const positionsPromises = sortedPools.map(async (pool) => {
					const lpToken = tokens[pool.assetId as number];
					const lpBalance = getTokenBalance(lpToken);

					if (!lpToken || !lpBalance || lpBalance.eq(0)) return null;

					let updatedSupply = lpToken.supply;
					try {
						const updatedToken = await fetchSingleTrnToken(pool.assetId, trnApi);
						if (updatedToken) {
							updatedSupply = updatedToken.supply;
						}
					} catch (error) {
						console.error(`Error fetching updated supply for token ${pool.assetId}:`, error);
					}

					const poolShare = lpBalance.div(updatedSupply).multipliedBy(100);
					const [xAssetId, yAssetId] = pool.poolKey.split("-").map(Number);

					return {
						assetId: pool.assetId,
						xToken: tokens[xAssetId],
						yToken: tokens[yAssetId],
						lpBalance,
						poolShare,
					};
				});

				const resolvedPositions = await Promise.all(positionsPromises);

				setPositions(resolvedPositions.filter((pool): pool is Position => !!pool));
			} catch (error) {
				console.error("Error calculating positions:", error);
				setPositions([]);
			} finally {
				setIsLoadingPositions(false);
			}
		};

		fetchPositions();
		return () => {
			isMounted = false;
		};
	}, [pools, tokens, isFetching, getTokenBalance, trnApi]);

	// Memoized derivation of the current liquidity pool based on selected tokens
	// ------------------------------------------------------------------------
	const liquidityPool = useMemo(() => {
		if (!state.xToken?.assetId || !state.yToken?.assetId) return undefined;

		const xAssetId = state.xToken.assetId;
		const yAssetId = state.yToken.assetId;

		return pools.find(({ poolKey }) => {
			const [x, y] = poolKey.split("-").map(Number);
			return (x === xAssetId && y === yAssetId) || (x === yAssetId && y === xAssetId);
		});
	}, [pools, state.xToken?.assetId, state.yToken?.assetId]);

	// Memoized derivation of the user's current position in the selected pool
	// ---------------------------------------------------------------------
	const currentPosition = useMemo(() => {
		if (!liquidityPool) return;

		const position = positions.find((pos) => pos.assetId === liquidityPool.assetId);
		if (!position) {
			console.warn("Failed to find LP position for assetId:", liquidityPool?.assetId);
			return undefined;
		}

		return position;
	}, [positions, liquidityPool]);

	// Effect to calculate pool balances when relevant state changes
	// ------------------------------------------------------------
	// Updates user's balances and pool share when tokens or positions change
	useEffect(() => {
		if (!state.xToken || !state.yToken || !liquidityPool || isFetching) {
			setPoolBalances(undefined);
			return;
		}

		const fetchPoolBalances = async () => {
			try {
				if (
					!liquidityPool ||
					!state.xToken ||
					!state.yToken ||
					isLoadingPositions ||
					!currentPosition
				)
					return;

				const asset = await fetchSingleTrnToken(currentPosition.assetId, trnApi);
				if (!asset) {
					throw new Error("Failed to fetch LP token data");
				}

				const [xAssetIdStr] = liquidityPool.poolKey.split("-");
				const xAssetId = Number(xAssetIdStr);

				const poolShare = currentPosition.poolShare.dividedBy(100);

				const xLiquidityIndex = xAssetId === state.xToken.assetId ? 0 : 1;
				const yLiquidityIndex = 1 - xLiquidityIndex; // The other index

				const xLiquidity = new Balance(liquidityPool.liquidity[xLiquidityIndex], state.xToken);
				const yLiquidity = new Balance(liquidityPool.liquidity[yLiquidityIndex], state.yToken);

				const xBalance = xLiquidity.multipliedBy(poolShare);
				const yBalance = yLiquidity.multipliedBy(poolShare);

				if (!isMounted) return;

				updateState({
					position: {
						...currentPosition,
					},
				});
				setPoolBalances({
					x: {
						balance: xBalance,
						liquidity: xLiquidity,
					},
					y: {
						balance: yBalance,
						liquidity: yLiquidity,
					},
				});
			} catch (error) {
				console.error("Error fetching pool balances:", error);
				setPoolBalances(undefined);
				if (error instanceof Error) {
					const errorMessage = error.message.includes("Failed to fetch")
						? "Could not retrieve pool data. Please check your connection."
						: "Error calculating pool balances. Please try again.";

					updateState({ error: errorMessage });
				}
			}
		};

		let isMounted = true;
		fetchPoolBalances();

		return () => {
			isMounted = false;
		};
	}, [
		state.xToken,
		state.yToken,
		liquidityPool,
		isFetching,
		positions,
		trnApi,
		updateState,
		setPoolBalances,
		isLoadingPositions,
		currentPosition,
	]);

	const {
		setXAmount,
		setYAmount,
		isDisabled: isTokenDisabled,
		refetchTokenBalances,
		...tokenInputs
	} = useTrnTokenInputs(
		state,
		setToken,
		state.action === "remove" ? state.poolBalances : undefined
	);

	const resetState = useCallback(() => {
		setState(initialState);
		setXAmount("");
		setYAmount("");
	}, [setXAmount, setYAmount]);

	const isDisabled = useMemo(() => {
		if (state.tag === "sign") return true;

		return isTokenDisabled || !!state.error || canPayForGas === false;
	}, [state.tag, state.error, isTokenDisabled, canPayForGas]);

	const onPoolClick = useCallback(
		(xToken: TrnToken, yToken: TrnToken) => {
			updateState({ xToken, yToken });
		},
		[updateState]
	);

	const onSwitchClick = useCallback(() => {
		updateState({ action: state.action === "add" ? "remove" : "add" });
	}, [state.action, updateState]);

	// Build the transaction based on current inputs
	// -------------------------------------------
	// Core function that prepares the transaction for signing
	const buildTransaction = useCallback(
		async ({
			xAmount = tokenInputs.xAmount,
			yAmount = tokenInputs.yAmount,
			slippage = state.slippage,
			lpToRemove = state.lpToRemove,
		}: {
			xAmount?: string;
			yAmount?: string;
			slippage?: string;
			lpToRemove?: Balance<TrnToken>;
		} = {}) => {
			if (
				!trnApi ||
				!state.xToken ||
				!state.yToken ||
				!xAmount ||
				!yAmount ||
				!signer ||
				!userSession ||
				!customEx ||
				// Check lpToRemove only for remove action
				(state.action === "remove" && (!state.position || !lpToRemove))
			) {
				setBuilder(undefined);
				setEstimatedFee(undefined);
				setCanPayForGas(undefined);
				updateState({ ratio: undefined, error: "" });
				return;
			}

			const xBalance = new Balance(xAmount, state.xToken, false);
			const yBalance = new Balance(yAmount, state.yToken, false);

			if (xBalance.eq(0) || yBalance.eq(0)) {
				setBuilder(undefined);
				setEstimatedFee(undefined);
				setCanPayForGas(undefined);
				updateState({ ratio: undefined, error: "" });
				return;
			}

			const xAmountMin = getMinAmount(xBalance, slippage);
			const yAmountMin = getMinAmount(yBalance, slippage);

			const xAmountMinBalance = new Balance(xAmountMin, state.xToken, false);
			const yAmountMinBalance = new Balance(yAmountMin, state.yToken, false);

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
				// Ensure position and lpToRemove are defined for remove action (checked earlier)
				tx = trnApi.tx.dex.removeLiquidity(
					state.xToken.assetId,
					state.yToken.assetId,
					lpToRemove!.toPlanckString(), // Use the precise lpToRemove value from state
					xAmountMinBalance.toPlanckString(),
					yAmountMinBalance.toPlanckString(),
					null,
					null
				);
			}

			try {
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
				const gasBalance = new Balance(+gasTokenBalance.balance, gasTokenBalance).toUnit();

				let canPay: boolean | undefined;
				let needsRebuild = false;
				let finalTx = tx; // Use a separate variable for potentially rebuilt tx

				if (state.action === "add") {
					let xAmountWithoutGas = xBalance;
					let yAmountWithoutGas = yBalance;
					const gasCost = new Balance(gas, state.gasToken).multipliedBy(1.5); // Safety margin

					if (state.xToken.assetId === state.gasToken.assetId) {
						xAmountWithoutGas = new Balance(xBalance.minus(gasCost), state.xToken, false);
						canPay = gasBalance.gte(xBalance); // Check if total balance covers original amount + gas
						needsRebuild = xAmountWithoutGas.gt(0); // Only rebuild if remaining amount is positive
					} else if (state.yToken.assetId === state.gasToken.assetId) {
						yAmountWithoutGas = new Balance(yBalance.minus(gasCost), state.yToken, false);
						canPay = gasBalance.gte(yBalance);
						needsRebuild = yAmountWithoutGas.gt(0);
					} else {
						canPay = gasBalance.gte(gasCost);
					}

					if (needsRebuild && canPay) {
						finalTx = trnApi.tx.dex.addLiquidity(
							state.xToken.assetId,
							state.yToken.assetId,
							xAmountWithoutGas.toPlanckString(),
							yAmountWithoutGas.toPlanckString(),
							getMinAmount(xAmountWithoutGas, slippage).toPlanckString(),
							getMinAmount(yAmountWithoutGas, slippage).toPlanckString(),
							null,
							null
						);
						// Rebuild the transaction with adjusted amounts
						builder = await createBuilder(
							userSession,
							state.gasToken.assetId,
							state.slippage,
							customEx,
							finalTx
						);
					}
				} else {
					// For remove liquidity, just check if gas balance covers the fee
					const gasCost = new Balance(gas, state.gasToken);
					canPay = gasBalance.gte(gasCost);
				}

				setCanPayForGas(canPay);
				if (canPay === false) {
					updateState({ error: `Insufficient ${state.gasToken.symbol} balance for gas fee` });
					setBuilder(undefined);
				} else {
					updateState({ error: "" });
					setBuilder(builder); // Set the final builder
				}
			} catch (error: any) {
				console.error("Error building transaction:", error);
				updateState({ error: "Failed to build transaction. Please try again." });
				setBuilder(undefined);
				setEstimatedFee(undefined);
				setCanPayForGas(undefined);
			}
		},
		[
			tokenInputs.xAmount,
			tokenInputs.yAmount,
			state.slippage,
			state.lpToRemove,
			state.xToken,
			state.yToken,
			state.position,
			state.action,
			state.gasToken,
			trnApi,
			signer,
			userSession,
			customEx,
			setBuilder,
			updateState,
		]
	);

	// Handler for updating token amounts
	// ---------------------------------
	// Updates both tokens while maintaining the pool ratio
	const setAmount = useCallback(
		({ src, amount }: { src: TokenSource; amount: string }) => {
			if (amount === "" || !state.xToken || !state.yToken || !state.position) {
				setXAmount("");
				setYAmount("");
				updateState({
					percentage: 0,
					ratio: undefined,
					estPoolShare: undefined,
					lpToRemove: undefined,
				});
				buildTransaction({ xAmount: "0", yAmount: "0" });
				return;
			}

			const otherSrc = src === "x" ? "y" : "x";
			const token = src === "x" ? state.xToken! : state.yToken!;
			const otherToken = src === "x" ? state.yToken! : state.xToken!;

			if (!state.poolBalances) return; // Should ideally not happen if tokens are set

			let xAmountStr: string;
			let yAmountStr: string;
			let percentage: number;
			let currentAmount = new Balance(amount, token, false);
			let lpToRemove: Balance<TrnToken> | undefined = undefined;

			if (state.action === "remove") {
				const maxBalance = state.poolBalances[src].balance.toUnit();
				if (currentAmount.gt(maxBalance)) {
					currentAmount = maxBalance; // Cap at max available balance
					amount = currentAmount.toString(); // Update amount string
				}

				percentage = maxBalance.eq(0)
					? 0
					: currentAmount.div(maxBalance).multipliedBy(100).toNumber();
				// Calculate precise LP tokens to remove based on the proportion of the user's total LP balance
				const proportion = maxBalance.eq(0) ? new BigNumber(0) : currentAmount.div(maxBalance);
				lpToRemove = state.position.lpBalance.multipliedBy(proportion).integerValue();
			} else {
				const tokenLiquidity = state.poolBalances[src].liquidity.toUnit();
				percentage = tokenLiquidity.plus(currentAmount).eq(0)
					? 0
					: currentAmount
							.div(tokenLiquidity.plus(currentAmount)) // Estimate based on new total liquidity
							.multipliedBy(100)
							.toNumber();
				lpToRemove = undefined; // Not applicable for 'add'
			}

			const tokenLiquidity = state.poolBalances[src].liquidity.toUnit();
			const otherLiquidity = state.poolBalances[otherSrc].liquidity.toUnit();
			// Avoid division by zero if tokenLiquidity is 0
			const otherAmount = tokenLiquidity.eq(0)
				? new Balance(0, otherToken, false)
				: currentAmount.multipliedBy(otherLiquidity.div(tokenLiquidity));

			if (src === "x") {
				xAmountStr = amount;
				yAmountStr = otherAmount.toString();
			} else {
				xAmountStr = otherAmount.toString();
				yAmountStr = amount;
			}

			setXAmount(xAmountStr);
			setYAmount(yAmountStr);

			const xBalance = new Balance(xAmountStr, state.xToken, false);
			const yBalance = new Balance(yAmountStr, state.yToken, false);
			const ratio = xBalance.gt(0) ? toFixed(yBalance.dividedBy(xBalance).toNumber(), 6) : "0";

			// Use the calculated percentage directly for display
			const displayPercentage = +toFixed(percentage, 1);

			updateState({
				ratio,
				estPoolShare: state.action === "add" ? displayPercentage : undefined,
				percentage: displayPercentage, // Store display percentage
				lpToRemove, // Store precise LP amount to remove (or undefined for add)
			});

			buildTransaction({
				xAmount: xAmountStr,
				yAmount: yAmountStr,
				lpToRemove,
			});
		},
		[
			state.xToken,
			state.yToken,
			state.action,
			state.position,
			state.poolBalances,
			setXAmount,
			setYAmount,
			updateState,
			buildTransaction,
		]
	);

	// Handler for setting percentage in remove liquidity mode
	// -----------------------------------------------------
	// Calculates token amounts based on percentage of position
	const setPercentage = useCallback(
		(percentage: number) => {
			if (!state.poolBalances || !state.xToken || !state.position || state.action !== "remove")
				return;

			// Ensure percentage is within bounds [0, 100]
			const validPercentage = Math.max(0, Math.min(100, percentage));

			// Calculate the corresponding X token amount based on the percentage of the user's balance
			const xPoolBalance = state.poolBalances.x.balance.toUnit();
			const xAmount = xPoolBalance.multipliedBy(validPercentage / 100);

			// Calculate the precise LP tokens to remove based on the percentage
			const lpToRemove = state.position.lpBalance
				.multipliedBy(validPercentage / 100)
				.integerValue();

			// Update lpToRemove in state *before* calling setAmount
			// setAmount will then use this lpToRemove when calling buildTransaction
			updateState({ lpToRemove, percentage: validPercentage });

			// Use setAmount to handle the logic of calculating the other token and updating amounts
			// It will recalculate percentage for display and ratio, but lpToRemove is now set correctly
			setAmount({ src: "x", amount: xAmount.toString() });
		},
		[state.poolBalances, state.xToken, state.position, state.action, setAmount, updateState]
	);

	const setSlippage = useCallback(
		(slippage: string) => {
			const parsed = parseSlippage(slippage);
			if (typeof parsed !== "string") return;

			updateState({ slippage: parsed });
			buildTransaction({ slippage: parsed });
		},
		[buildTransaction, updateState]
	);

	// Handler for signing and submitting the transaction
	// ------------------------------------------------
	const signTransaction = useCallback(async () => {
		if (!state.builder) return;

		setTag("sign");
		try {
			const result = await state.builder.signAndSend({
				onSign: () => {
					setTag("submit");
				},
				onSend: () => {
					setTag("submitted");
				},
			});
			if (!result) {
				setTag(undefined); // Clear tag if signing cancelled/failed early
				return;
			}

			refetchTokenBalances();
			refetchTrnTokenBalances();

			updateState({
				explorerUrl: `${ROOT_NETWORK.ExplorerUrl}/extrinsic/${formatRootscanId(result.extrinsicId)}`,
			});

			await queryClient.invalidateQueries({
				queryKey: ["trnLiquidityPools"],
			});
			updateState({
				percentage: 0,
				ratio: undefined,
				estPoolShare: undefined,
				lpToRemove: undefined,
			});
			setXAmount("");
			setYAmount("");
			buildTransaction({ xAmount: "0", yAmount: "0" });
		} catch (err: any) {
			console.error("Transaction failed:", err);
			setTag("failed");
			updateState({
				error: "Transaction failed. Please try again.",
			});
		}
	}, [
		setTag,
		state.builder,
		refetchTokenBalances,
		refetchTrnTokenBalances,
		updateState,
		setXAmount,
		setYAmount,
		buildTransaction,
		queryClient,
	]);

	const checkValidPool = useCheckValidPool();

	// Effect to validate if the selected token pair forms a valid pool
	// --------------------------------------------------------------
	useEffect(() => {
		if (!state.xToken || !state.yToken) {
			updateState({ error: "" });
			return;
		}

		let isMounted = true;
		let validationError = "";

		const validate = async () => {
			const isValid = await checkValidPool([state.xToken!.assetId, state.yToken!.assetId]);
			if (!isMounted) return;

			if (!isValid) {
				validationError = "This pair is not valid yet. Choose another token to deposit";
			}

			// Update error state based *only* on validation for now
			// Gas check error is handled within buildTransaction
			updateState({ error: validationError });
		};

		validate();

		return () => {
			isMounted = false;
		};
	}, [state.xToken, state.yToken, checkValidPool, updateState]);

	// Memoized parameters for transaction rebuilding
	// --------------------------------------------
	// Prevents unnecessary rebuilds when values haven't changed
	const rebuildParams = useMemo(
		() => ({
			xAmount: tokenInputs.xAmount,
			yAmount: tokenInputs.yAmount,
			slippage: state.slippage,
			lpToRemove: state.lpToRemove,
		}),
		[tokenInputs.xAmount, tokenInputs.yAmount, state.slippage, state.lpToRemove]
	);

	// Effect to rebuild transaction when key parameters change
	// ------------------------------------------------------
	useEffect(() => {
		try {
			buildTransaction(rebuildParams || {});
		} catch (error) {
			console.error("Error in transaction rebuild effect:", error);
			updateState({
				error: "Failed to prepare transaction. Please try again.",
			});
		}
	}, [
		buildTransaction,
		state.action,
		state.xToken,
		state.yToken,
		rebuildParams,
		state.gasToken,
		updateState,
	]);

	return {
		...state,
		...tokenInputs,
		resetState,
		onPoolClick,
		onSwitchClick,
		setPercentage,
		estimatedFee,
		setSlippage,
		setGasToken,
		setTag,
		unSetTokens,
		setAmount,
		isDisabled,
		signTransaction,
		positions,
		currentPosition,
		isLoadingPositions,
		isFetchingPools: isFetching,
	};
}

export function ManagePoolProvider({ children }: PropsWithChildren) {
	const managePoolState = useManagePoolState();

	const contextValue = useMemo(() => managePoolState, [managePoolState]);

	return <ManagePoolContext.Provider value={contextValue}>{children}</ManagePoolContext.Provider>;
}

export function useManagePool() {
	const context = useContext(ManagePoolContext);
	if (context === undefined) {
		throw new Error("useManagePool must be used within a ManagePoolProvider");
	}
	return context;
}
