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

import type { ContextTag, TokenSource, TrnToken } from "@/libs/types";

import { useTrnTokens, useWallets } from ".";
import { DEFAULT_GAS_TOKEN, ROOT_NETWORK } from "../constants";
import { createPoolError, errorToString, getWithdrawalError } from "../errors";
import type { PoolError } from "../errors";
import {
	type TrnTokenInputs,
	type TrnTokenInputState,
	useCheckTrnWithdrawalAmounts,
	useCheckValidPool,
	useCustomExtrinsicBuilder,
	useTrnPoolFinder,
	useTrnPoolPositions,
	useTrnTokenInputs,
} from "../hooks";
import {
	Balance,
	calculateTrnPoolBalances,
	formatRootscanId,
	getMinAmount,
	parseSlippage,
	toFixed,
} from "../utils";
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
	positions: Array<Position>;
	currentPosition?: Position;
	error: string;

	isLoadingPositions: boolean;
	isFetchingPools: boolean;
	isLoadingPools: boolean;

	estimatedFee?: string;

	resetState: () => void;
	onPoolClick: (xToken: TrnToken, yToken: TrnToken) => void;
	onSwitchClick: () => void;
	signTransaction: () => Promise<void>;
	unSetTokens: () => void;

	setAmount: (args: { src: TokenSource; amount: string }) => void;
	setPercentage: (percentage: number) => void;
	setSlippage: (slippage: string) => void;
	setGasToken: (token: TrnToken) => void;
	setTag: (tag?: ContextTag) => void;
} & ManagePoolState &
	Omit<TrnTokenInputs, "setXAmount" | "setYAmount" | "refetchTokenBalances">;

interface ManagePoolState extends TrnTokenInputState {
	position?: Position;
	poolBalances?: PoolBalances;

	action: "add" | "remove";
	percentage?: number;
	slippage: string;
	gasToken: TrnToken;

	tag?: ContextTag;
	errorObj?: PoolError;

	builder?: CustomExtrinsicBuilder;
	explorerUrl?: string;

	ratio?: string;
	estPoolShare?: number;
	lpToRemove?: Balance<TrnToken>;
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

	const updateState = useCallback((update: Partial<ManagePoolState>) => {
		setState((prev) => ({ ...prev, ...update }));
	}, []);

	const setTag = useCallback((tag?: ContextTag) => updateState({ tag }), [updateState]);
	const setGasToken = useCallback((gasToken: TrnToken) => updateState({ gasToken }), [updateState]);
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
	const signer = useFutureverseSigner();
	const { userSession } = useWallets();

	const {
		getTokenBalance,
		pools,
		tokens,
		isFetchingPools,
		isLoadingPools,
		refetchTokenBalances: refetchTrnTokenBalances,
	} = useTrnTokens();

	const customEx = useCustomExtrinsicBuilder({
		trnApi,
		walletAddress: userSession?.eoa ?? "",
		signer,
	});

	const { positions, isLoadingPositions } = useTrnPoolPositions(
		pools,
		tokens,
		getTokenBalance,
		trnApi,
		isFetchingPools
	);

	const { liquidityPool, currentPosition } = useTrnPoolFinder(
		pools,
		positions,
		state.xToken,
		state.yToken
	);

	const checkWithdrawal = useCheckTrnWithdrawalAmounts();

	// Effect to calculate pool balances when relevant state changes
	// ------------------------------------------------------------
	// Updates user's balances and pool share when tokens or positions change
	useEffect(() => {
		if (!state.xToken || !state.yToken || !liquidityPool || isLoadingPools) {
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

				const balances = await calculateTrnPoolBalances({
					liquidityPool,
					currentPosition,
					xToken: state.xToken,
					yToken: state.yToken,
					trnApi,
				});

				if (!isMounted) return;

				updateState({
					position: {
						...currentPosition,
					},
				});
				setPoolBalances(balances);
			} catch (error) {
				console.error("Error fetching pool balances:", error);
				setPoolBalances(undefined);
				if (error instanceof Error) {
					const errorMessage = error.message.includes("Failed to fetch")
						? "Could not retrieve pool data. Please check your connection."
						: "Error calculating pool balances. Please try again.";

					const errorObj = createPoolError(errorMessage, "NETWORK", "error");
					updateState({ errorObj });
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
		isLoadingPools,
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

		return isTokenDisabled || !!state.errorObj || canPayForGas === false;
	}, [state.tag, state.errorObj, isTokenDisabled, canPayForGas]);

	const onPoolClick = useCallback(
		(xToken: TrnToken, yToken: TrnToken) => {
			updateState({ xToken, yToken });
		},
		[updateState]
	);

	const onSwitchClick = useCallback(() => {
		updateState({ action: state.action === "add" ? "remove" : "add", errorObj: undefined });
	}, [state.action, updateState]);

	// Helper functions for transaction building
	// ------------------------------------------
	const validateBuildInputs = useCallback(
		(
			xAmount: string,
			yAmount: string,
			xToken?: TrnToken,
			yToken?: TrnToken,
			action?: string,
			position?: Position,
			lpToRemove?: Balance<TrnToken>
		) => {
			if (
				!trnApi ||
				!xToken ||
				!yToken ||
				!xAmount ||
				!yAmount ||
				!signer ||
				!userSession ||
				!customEx ||
				(action === "remove" && (!position || !lpToRemove))
			) {
				return false;
			}

			const xBalance = new Balance(xAmount, xToken, false);
			const yBalance = new Balance(yAmount, yToken, false);

			if (xBalance.eq(0) || yBalance.eq(0)) {
				return false;
			}

			return { xBalance, yBalance };
		},
		[trnApi, signer, userSession, customEx]
	);

	const createAddLiquidityTx = useCallback(
		(
			xToken: TrnToken,
			yToken: TrnToken,
			xBalance: Balance<TrnToken>,
			yBalance: Balance<TrnToken>,
			slippage: string
		) => {
			const xAmountMin = getMinAmount(xBalance, slippage);
			const yAmountMin = getMinAmount(yBalance, slippage);

			return trnApi!.tx.dex.addLiquidity(
				xToken.assetId,
				yToken.assetId,
				xBalance.toPlanckString(),
				yBalance.toPlanckString(),
				xAmountMin.toString(),
				yAmountMin.toString(),
				null,
				null
			);
		},
		[trnApi]
	);

	const createRemoveLiquidityTx = useCallback(
		(
			xToken: TrnToken,
			yToken: TrnToken,
			lpToRemove: Balance<TrnToken>,
			xBalance: Balance<TrnToken>,
			yBalance: Balance<TrnToken>,
			slippage: string
		) => {
			const xAmountMin = getMinAmount(xBalance, slippage);
			const yAmountMin = getMinAmount(yBalance, slippage);

			return trnApi!.tx.dex.removeLiquidity(
				xToken.assetId,
				yToken.assetId,
				lpToRemove.toPlanckString(),
				xAmountMin.toString(),
				yAmountMin.toString(),
				null,
				null
			);
		},
		[trnApi]
	);

	const handleGasCalculation = useCallback(
		async (
			builder: CustomExtrinsicBuilder,
			xBalance: Balance<TrnToken>,
			yBalance: Balance<TrnToken>,
			gasToken: TrnToken,
			xToken: TrnToken,
			yToken: TrnToken,
			action: string,
			slippage: string
		) => {
			const { gasString } = await builder.getGasFees();
			const [gas] = gasString.split(" ");
			setEstimatedFee(gas);

			const gasTokenBalance = await builder.checkBalance({
				walletAddress: userSession!.futurepass,
				assetId: gasToken.assetId,
			});
			const gasBalance = new Balance(+gasTokenBalance.balance, gasTokenBalance).toUnit();

			let canPay: boolean | undefined;
			let needsRebuild = false;
			let adjustedXAmount = xBalance;
			let adjustedYAmount = yBalance;
			const gasCost = new Balance(gas, gasToken).multipliedBy(1.5); // Safety margin

			if (action === "add") {
				if (xToken.assetId === gasToken.assetId) {
					adjustedXAmount = new Balance(xBalance.minus(gasCost), xToken, false);
					canPay = gasBalance.gte(xBalance);
					needsRebuild = adjustedXAmount.gt(0);
				} else if (yToken.assetId === gasToken.assetId) {
					adjustedYAmount = new Balance(yBalance.minus(gasCost), yToken, false);
					canPay = gasBalance.gte(yBalance);
					needsRebuild = adjustedYAmount.gt(0);
				} else {
					canPay = gasBalance.gte(gasCost);
				}
			} else {
				canPay = gasBalance.gte(gasCost);
			}

			return {
				canPay,
				needsRebuild,
				adjustedXAmount,
				adjustedYAmount,
				gas,
			};
		},
		[userSession]
	);

	const handleCheck = useCallback(
		(
			lpToRemove: Balance<TrnToken>,
			amountXReserve: Balance<TrnToken>,
			amountYReserve: Balance<TrnToken>,
			totalSupply: string,
			amountXMin: Balance<TrnToken>,
			amountYMin: Balance<TrnToken>
		) => {
			const liquidityBigInt = BigInt(lpToRemove.toPlanckString());
			const reserveABigInt = BigInt(amountXReserve.toPlanckString());
			const reserveBBigInt = BigInt(amountYReserve.toPlanckString());
			const totalSupplyBigInt = BigInt(totalSupply ?? "0");
			const amountAMinBigInt = BigInt(amountXMin.toPlanckString());
			const amountBMinBigInt = BigInt(amountYMin.toPlanckString());

			return checkWithdrawal(
				liquidityBigInt,
				reserveABigInt,
				reserveBBigInt,
				totalSupplyBigInt,
				amountAMinBigInt,
				amountBMinBigInt
			);
		},
		[checkWithdrawal]
	);

	const validateWithdrawal = useCallback(
		(
			lpToRemove: Balance<TrnToken>,
			poolBalances: PoolBalances,
			liquidityPool: any,
			xBalance: Balance<TrnToken>,
			yBalance: Balance<TrnToken>,
			slippage: string,
			xToken: TrnToken,
			yToken: TrnToken
		): { success: boolean; error?: PoolError } => {
			try {
				const xAmountMin = getMinAmount(xBalance, slippage);
				const yAmountMin = getMinAmount(yBalance, slippage);

				const withdrawalResult = handleCheck(
					lpToRemove,
					poolBalances.x.liquidity,
					poolBalances.y.liquidity,
					liquidityPool.lpTokenSupply ?? "0",
					xAmountMin,
					yAmountMin
				);

				if (!withdrawalResult.success && withdrawalResult.error && withdrawalResult.errorType) {
					const errorObj = getWithdrawalError(
						withdrawalResult.error,
						xToken.symbol,
						yToken.symbol,
						withdrawalResult.errorType
					);
					return { success: withdrawalResult.success, error: errorObj };
				}

				return { success: true };
			} catch (error) {
				console.error("Error in withdrawal validation:", error);
				return {
					success: false,
					error: createPoolError(
						"Failed to validate withdrawal",
						"UNKNOWN",
						"error",
						"Please try again."
					),
				};
			}
		},
		[handleCheck]
	);

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
			const resetStates = () => {
				setBuilder(undefined);
				setEstimatedFee(undefined);
				setCanPayForGas(undefined);
				updateState({ errorObj: undefined });
			};

			const validationResult = validateBuildInputs(
				xAmount,
				yAmount,
				state.xToken,
				state.yToken,
				state.action,
				state.position,
				lpToRemove
			);

			if (!validationResult) {
				resetStates();
				return;
			}

			const { xBalance, yBalance } = validationResult;
			const xBalancePlanck = xBalance.toPlanck();
			const yBalancePlanck = yBalance.toPlanck();

			try {
				let tx: SubmittableExtrinsic<"promise", ISubmittableResult>;
				if (
					state.action === "remove" &&
					state.position &&
					state.poolBalances &&
					liquidityPool &&
					lpToRemove
				) {
					const validationResult = validateWithdrawal(
						lpToRemove,
						state.poolBalances,
						liquidityPool,
						xBalancePlanck,
						yBalancePlanck,
						slippage,
						state.xToken!,
						state.yToken!
					);

					if (!validationResult.success && validationResult.error) {
						resetStates();
						updateState({
							errorObj: validationResult.error,
						});
						return;
					}

					tx = createRemoveLiquidityTx(
						state.xToken!,
						state.yToken!,
						lpToRemove,
						xBalancePlanck,
						yBalancePlanck,
						slippage
					);
				} else {
					tx = createAddLiquidityTx(
						state.xToken!,
						state.yToken!,
						xBalancePlanck,
						yBalancePlanck,
						slippage
					);
				}

				let builder = await createBuilder(
					userSession!,
					state.gasToken.assetId,
					slippage,
					customEx!,
					tx
				);

				// Handle gas calculation and potential rebuilding
				const { canPay, needsRebuild, adjustedXAmount, adjustedYAmount, gas } =
					await handleGasCalculation(
						builder,
						xBalance,
						yBalance,
						state.gasToken,
						state.xToken!,
						state.yToken!,
						state.action,
						slippage
					);

				// Rebuild transaction if needed
				if (needsRebuild && canPay) {
					const newTx = createAddLiquidityTx(
						state.xToken!,
						state.yToken!,
						adjustedXAmount,
						adjustedYAmount,
						slippage
					);

					builder = await createBuilder(
						userSession!,
						state.gasToken.assetId,
						slippage,
						customEx!,
						newTx
					);
				}

				// Update state based on gas calculation
				setCanPayForGas(canPay);
				if (canPay === false && gas) {
					const errorObj = createPoolError(
						`Insufficient ${state.gasToken.symbol} balance for gas fee`,
						"BALANCE",
						"error"
					);
					updateState({ errorObj });
					setBuilder(undefined);
				} else {
					updateState({ errorObj: undefined });
					setBuilder(builder);
				}
			} catch (error: any) {
				console.error("Error building transaction:", error);
				const errorObj = createPoolError(
					"Failed to build transaction",
					"TRANSACTION",
					"error",
					"Please try again."
				);
				resetStates();
				updateState({
					errorObj,
				});
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
			state.poolBalances,
			liquidityPool,
			userSession,
			customEx,
			validateBuildInputs,
			validateWithdrawal,
			createAddLiquidityTx,
			createRemoveLiquidityTx,
			handleGasCalculation,
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

			if (!state.poolBalances || !liquidityPool) return; // Exit if no pool balances or liquidity pool data

			let xAmountStr: string;
			let yAmountStr: string;
			let percentage: number;
			let estPoolShare: number | undefined;
			let currentAmount = new Balance(amount, token, false);
			let lpToRemove: Balance<TrnToken> | undefined = undefined;

			if (state.action === "remove") {
				const maxBalance = state.poolBalances[src].balance.toUnit();
				if (currentAmount.gt(maxBalance)) {
					currentAmount = maxBalance; // Cap at max available balance
					amount = currentAmount.toString();
				}

				percentage = maxBalance.eq(0)
					? 0
					: currentAmount.div(maxBalance).multipliedBy(100).toNumber();

				// Calculate precise LP tokens to remove based on the proportion of the user's total LP balance
				const proportion = maxBalance.eq(0) ? new BigNumber(0) : currentAmount.div(maxBalance);
				lpToRemove = state.position.lpBalance.multipliedBy(proportion).integerValue();

				// For removal, estPoolShare is undefined as it's not applicable
				estPoolShare = undefined;
			} else {
				const totalLpSupply = new BigNumber(liquidityPool.lpTokenSupply || "0");

				// Get current reserves from the pool
				const xReserve = state.poolBalances.x.liquidity.toUnit();
				const yReserve = state.poolBalances.y.liquidity.toUnit();

				// Calculate proportional LP tokens based on the smaller ratio, as done
				// in Dex pallet
				const xRatio =
					src === "x"
						? currentAmount.div(xReserve)
						: new Balance(amount, otherToken, false).div(xReserve);

				const yRatio =
					src === "y"
						? currentAmount.div(yReserve)
						: new Balance(amount, otherToken, false).div(yReserve);

				// LP tokens to be minted = totalSupply * min(xRatio, yRatio)
				const minRatio = BigNumber.min(xRatio, yRatio);
				const estimatedLpTokens = totalLpSupply.multipliedBy(minRatio);

				// Get user's existing LP token balance
				const existingLpBalance = state.position?.lpBalance;

				// Calculate user's total LP tokens after adding liquidity
				const totalUserLpTokens = existingLpBalance.plus(estimatedLpTokens);

				// Calculate estimated pool share percentage
				const newTotalSupply = totalLpSupply.plus(estimatedLpTokens);
				estPoolShare = newTotalSupply.eq(0)
					? 0
					: totalUserLpTokens.div(newTotalSupply).multipliedBy(100).toNumber();

				// Calculate percentage based on user's current + new LP tokens
				percentage = existingLpBalance.plus(estimatedLpTokens).eq(0)
					? 0
					: estimatedLpTokens.div(totalUserLpTokens).multipliedBy(100).toNumber();

				lpToRemove = undefined; // Not applicable for 'add'
			}

			// Calculate other token amount based on pool ratio
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

			const displayPercentage = +toFixed(percentage, 1);
			const displayPoolShare = estPoolShare !== undefined ? +toFixed(estPoolShare, 6) : undefined;

			updateState({
				ratio,
				estPoolShare: displayPoolShare,
				percentage: displayPercentage,
				lpToRemove,
			});
		},
		[
			state.xToken,
			state.yToken,
			state.action,
			state.position,
			state.poolBalances,
			liquidityPool, // Add this dependency
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
			const errorObj = createPoolError(
				"Transaction failed",
				"TRANSACTION",
				"error",
				"Please try again."
			);
			updateState({
				errorObj,
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
			updateState({ errorObj: undefined });
			return;
		}

		let isMounted = true;

		const validate = async () => {
			const isValid = await checkValidPool([state.xToken!.assetId, state.yToken!.assetId]);
			if (!isMounted) return;

			if (!isValid) {
				const errorObj = createPoolError(
					"This pair is not valid yet",
					"VALIDATION",
					"error",
					"Choose another token to deposit"
				);
				updateState({ errorObj });
			} else {
				updateState({ errorObj: undefined });
			}
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
				errorObj: createPoolError(
					"Failed to prepare transaction",
					"TRANSACTION",
					"error",
					"Please try again."
				),
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
		get error() {
			return state.errorObj ? errorToString(state.errorObj) : "";
		},
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
		isFetchingPools,
		isLoadingPools,
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
