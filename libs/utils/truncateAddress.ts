export function truncateAddress(address?: string): string {
	if (address == null) {
		return "";
	}

	return address.substring(0, 6) + "..." + address.substring(address.length - 4, address.length);
}
