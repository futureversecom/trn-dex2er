export type ErrorType =
	| "VALIDATION"
	| "TRANSACTION"
	| "NETWORK"
	| "BALANCE"
	| "SLIPPAGE"
	| "WITHDRAWAL"
	| "UNKNOWN";

export enum WithdrawalError {
	InsufficientWithdrawnAmountA = "InsufficientWithdrawnAmountA",
	InsufficientWithdrawnAmountB = "InsufficientWithdrawnAmountB",
	InsufficientLiquidityBurnt = "InsufficientLiquidityBurnt",
	InvalidInput = "InvalidInput",
}

export type ErrorSeverity = "error" | "warning" | "info";

export interface PoolError {
	message: string;
	type: ErrorType;
	severity: ErrorSeverity;
	details?: string;
}

export function createPoolError(
	message: string,
	type: ErrorType = "UNKNOWN",
	severity: ErrorSeverity = "error",
	details?: string
): PoolError {
	return {
		message,
		type,
		severity,
		details,
	};
}

export function getWithdrawalError(
	error: WithdrawalError,
	xTokenSymbol = "token A",
	yTokenSymbol = "token B",
	errorType: ErrorType = "WITHDRAWAL"
): PoolError {
	switch (error) {
		case WithdrawalError.InsufficientWithdrawnAmountA:
			return createPoolError(
				`Not enough ${xTokenSymbol} available to withdraw.`,
				errorType,
				"warning",
				"You can fix this by increasing your slippage tolerance."
			);

		case WithdrawalError.InsufficientWithdrawnAmountB:
			return createPoolError(
				`Not enough ${yTokenSymbol} available to withdraw.`,
				errorType,
				"warning",
				"You can fix this by increasing your slippage tolerance."
			);

		case WithdrawalError.InsufficientLiquidityBurnt:
			return createPoolError(
				"The withdrawal amount is too small.",
				errorType,
				"error",
				"Please try withdrawing a larger amount."
			);

		default:
			return createPoolError(
				"Something went wrong with your withdrawal.",
				errorType,
				"error",
				"Please try again with different settings."
			);
	}
}

export function errorToString(error: PoolError): string {
	return error.details ? `${error.message} ${error.details}` : error.message;
}
