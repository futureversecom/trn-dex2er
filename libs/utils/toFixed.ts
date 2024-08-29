export function toFixed(num: number, precision = 2): string {
	return num.toFixed(precision).replace(/^(\d+)(?:\.0+|(\.\d*?)0+)$/, "$1$2");
}
