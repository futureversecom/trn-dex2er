import { TokenImage } from "./TokenImage";

export function Tokens({ xSymbol, ySymbol }: { xSymbol?: string; ySymbol?: string }) {
	if (!xSymbol || !ySymbol) {
		return null;
	}

	return (
		<span className="relative flex justify-center pl-2">
			<TokenImage symbol={xSymbol} />
			<TokenImage symbol={ySymbol} className="relative -left-2" />
		</span>
	);
}
