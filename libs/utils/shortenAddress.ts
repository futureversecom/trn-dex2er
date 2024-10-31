export function shortenAddress(address: string) {
	return address.slice(0, 5).concat("...").concat(address.slice(-5));
}
