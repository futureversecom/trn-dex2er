import { useCallback } from "react";

import { WithdrawalError } from "../errors";
import type { ErrorType } from "../errors/manageTrnPoolErrors";

interface WithdrawalCheckResult {
	success: boolean;
	error?: WithdrawalError;
	errorType?: ErrorType;
}

/**
 * React hook that provides a memoized function to check if a liquidity removal
 * would fail due to receiving less than the specified minimum amounts.
 *
 * @returns A memoized function `checkWithdrawalAmounts`.
 */
export const useCheckTrnWithdrawalAmounts = () => {
	/**
	 * Checks if a liquidity removal would fail due to receiving less than the specified minimum amounts.
	 * Mimics the checks in the Substrate pallet.
	 *
	 * @param liquidity - The amount of LP tokens the user wants to burn (as bigint).
	 * @param amountAReserve - The current reserve of token A in the pool (as bigint).
	 * @param amountBReserve - The current reserve of token B in the pool (as bigint).
	 * @param totalSupply - The total supply of the LP token for this pair (as bigint).
	 * @param amountAMin - The minimum amount of token A the user accepts (as bigint).
	 * @param amountBMin - The minimum amount of token B the user accepts (as bigint).
	 * @returns An object indicating success or failure, and the specific error if applicable.
	 */
	const checkWithdrawalAmounts = useCallback(
		(
			liquidity: bigint,
			amountAReserve: bigint,
			amountBReserve: bigint,
			totalSupply: bigint,
			amountAMin: bigint,
			amountBMin: bigint
		): WithdrawalCheckResult => {
			if (
				totalSupply <= 0n ||
				liquidity <= 0n ||
				amountAReserve < 0n ||
				amountBReserve < 0n ||
				amountAMin < 0n ||
				amountBMin < 0n
			) {
				return { success: false, error: WithdrawalError.InvalidInput };
			}

			// Calculate amount0 = (liquidity * balance0) / totalSupply;
			const calculatedAmountA = (liquidity * amountAReserve) / totalSupply;

			// Calculate amount1 = (liquidity * balance1) / totalSupply;
			const calculatedAmountB = (liquidity * amountBReserve) / totalSupply;

			console.log("calculatedAmountA", calculatedAmountA);
			console.log("calculatedAmountB", calculatedAmountB);

			if (calculatedAmountA <= 0n || calculatedAmountB <= 0n) {
				return {
					success: false,
					error: WithdrawalError.InsufficientLiquidityBurnt,
					errorType: "WITHDRAWAL",
				};
			}

			if (calculatedAmountA < amountAMin) {
				return {
					success: false,
					error: WithdrawalError.InsufficientWithdrawnAmountA,
					errorType: "SLIPPAGE",
				};
			}

			if (calculatedAmountB < amountBMin) {
				return {
					success: false,
					error: WithdrawalError.InsufficientWithdrawnAmountB,
					errorType: "SLIPPAGE",
				};
			}

			return {
				success: true,
			};
		},
		[]
	);

	return checkWithdrawalAmounts;
};
