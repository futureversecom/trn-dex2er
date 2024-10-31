import type { VoidFn } from "@polkadot/api/types";
import { useEffect, useRef, useState } from "react";

import { setStateWithRef } from "../utils";

export function useTrnApiSubscription(subscribe: () => Promise<VoidFn | undefined>) {
	const [unsubscribe, setUnsubscribe] = useState<VoidFn>();
	const unsubRef = useRef(unsubscribe);

	useEffect(() => {
		(async () => {
			const unsub = await subscribe();
			setStateWithRef(unsub, setUnsubscribe, unsubRef);
		})();

		const unsub = unsubRef.current;
		return () => {
			unsub?.();
		};
	}, [subscribe]);
}
