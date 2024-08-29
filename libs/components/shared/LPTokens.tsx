import { Text, Tokens } from "./";

export function LPTokens({ tokens }: { tokens: [string, string] }) {
	return (
		<div className="space-y-2">
			<Tokens xSymbol={tokens[0]} ySymbol={tokens[1]} />

			<Text className="!text-neutral-500">
				{tokens[0]} / {tokens[1]}
			</Text>
		</div>
	);
}
