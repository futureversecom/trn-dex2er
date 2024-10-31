export function humanToNumber(num: string) {
	return parseInt(num.replace(/,/g, ""));
}
