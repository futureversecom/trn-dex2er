export function toDollarValue(amount: number) {
	return amount.toLocaleString("en-US", { maximumFractionDigits: 2 });
}
