export function parseSlippage(slippage: string) {
	let slippageNumber = Number(slippage);

	if (isNaN(slippageNumber)) {
		return slippage === "" ? "" : null;
	}

	if (slippageNumber < 0) {
		return "";
	} else if (slippageNumber > 100) {
		return "100";
	}

	const [_integer, decimal] = slippage.split(".");
	if (decimal) {
		return slippageNumber.toFixed(1);
	}

	return slippage;
}
