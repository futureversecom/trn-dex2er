export function toDollarValue(amount: string | number) {
	return Number((+amount).toLocaleString("en-US", { maximumFractionDigits: 2 }));
}
