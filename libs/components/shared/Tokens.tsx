import { TokenImage } from "./TokenImage";

export function Tokens({
	xSymbol,
	ySymbol,
	xIssuer,
	yIssuer,
}: {
	xSymbol?: string;
	ySymbol?: string;
	xIssuer?: string;
	yIssuer?: string;
}) {
	if (!xSymbol || !ySymbol) {
		return null;
	}

	return (
		<span className="relative flex justify-center pl-2">
			<TokenImage symbol={xSymbol} issuer={xIssuer} />
			<TokenImage symbol={ySymbol} issuer={yIssuer} className="relative -left-2" />
		</span>
	);
}
