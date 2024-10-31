import type { MutableRefObject } from "react";

/*
 * Sets state with a ref
 * Prevents infinite loop when adding subscriptions to api
 */
export const setStateWithRef = <T>(
	value: T,
	setState: (_state: T) => void,
	ref: MutableRefObject<T>
): void => {
	setState(value);
	ref.current = value;
};
