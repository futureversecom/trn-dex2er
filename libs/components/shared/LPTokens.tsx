import { Text, Tokens } from "./";

export function LPTokens({
	tokens,
	issuers,
}: {
	tokens: [string, string];
	issuers?: [string, string];
}) {
	return (
		<div className="space-y-2">
			<Tokens
				xSymbol={tokens[0]}
				ySymbol={tokens[1]}
				xIssuer={issuers && issuers[0]}
				yIssuer={issuers && issuers[1]}
			/>

			<Text className="!text-neutral-500">
				{tokens[0]} / {tokens[1]}
			</Text>
		</div>
	);
}
