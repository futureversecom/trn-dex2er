import { UserSession } from "@futureverse/auth";
import { CustomExtrinsicBuilder } from "@futureverse/transact";
import { SubmittableExtrinsic } from "@polkadot/api/types";
import { ISubmittableResult } from "@polkadot/types/types";

import { DEFAULT_GAS_TOKEN } from "../constants";

export async function createBuilder(
	userSession: UserSession,
	gasTokenAssetId: number,
	slippage: string,
	builder: CustomExtrinsicBuilder,
	extrinsic: SubmittableExtrinsic<"promise", ISubmittableResult>
): Promise<CustomExtrinsicBuilder> {
	builder.reset();
	const fromEx = builder.fromExtrinsic(extrinsic);

	if (gasTokenAssetId === DEFAULT_GAS_TOKEN.assetId) {
		try {
			await fromEx.addFuturePass(userSession.futurepass);
		} catch (err: any) {
			console.info(err);
		}
	} else {
		try {
			await fromEx.addFuturePassAndFeeProxy({
				futurePass: userSession.futurepass,
				assetId: gasTokenAssetId,
				slippage: +slippage,
			});
		} catch (err: any) {
			console.info(err);
		}
	}

	return fromEx;
}
