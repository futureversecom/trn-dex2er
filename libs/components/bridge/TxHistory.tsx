import { useBridgeHistory } from "@/libs/hooks";

export function TxHistory() {
	const history = useBridgeHistory();

	console.log({ history });

	return <div></div>;
}
