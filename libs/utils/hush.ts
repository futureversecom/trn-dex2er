import * as t from "io-ts";

export function hush<T>(result: t.Validation<T>): T | null {
	return result._tag === "Right" ? result.right : null;
}
