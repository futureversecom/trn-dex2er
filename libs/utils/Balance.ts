import type { AnyNumber } from "@polkadot/types/types";
import BigNumber from "bignumber.js";

type Value = BigNumber.Value | AnyNumber | bigint;

export class Balance<T extends { decimals: number }> extends BigNumber {
	asset: T;
	isPlanck: boolean;

	constructor(value: Value, asset: T, isPlanck: boolean = true) {
		super(value instanceof BigInt ? value.toString() : (value as BigNumber.Value));
		this.asset = asset;
		this.isPlanck = isPlanck;
	}

	toUnit(): Balance<T> {
		if (!this.isPlanck) return this;
		return this.dividedBy(BigNumber(10).pow(this.asset.decimals));
	}

	toPlanck(): Balance<T> {
		if (this.isPlanck) return this;
		return this.multipliedBy(BigNumber(10).pow(this.asset.decimals)).integerValue();
	}

	toPlanckString(): string {
		if (this.isPlanck) return this.toNumber().toLocaleString("fullwide", { useGrouping: false });

		return this.toPlanck().toNumber().toLocaleString("fullwide", { useGrouping: false });
	}

	toHuman(): string {
		const options = { minimumFractionDigits: this.asset.decimals };

		if (!this.isPlanck)
			return this.toNumber()
				.toLocaleString("en-US", options)
				.replace(/^(\d+)(?:\.0+|(\.\d*?)0+)$/, "$1$2");

		return this.toUnit()
			.toNumber()
			.toLocaleString("en-US", options)
			.replace(/^(\d+)(?:\.0+|(\.\d*?)0+)$/, "$1$2");
	}

	override toString(): string {
		return this.toNumber().toLocaleString("fullwide", {
			useGrouping: false,
			maximumFractionDigits: this.asset.decimals,
		});
	}

	override plus(n: BigNumber.Value, base?: number): Balance<T> {
		return new Balance(super.plus(n, base), this.asset);
	}

	override minus(n: BigNumber.Value, base?: number): Balance<T> {
		return new Balance(super.minus(n, base), this.asset);
	}

	override multipliedBy(n: BigNumber.Value, base?: number): Balance<T> {
		return new Balance(super.multipliedBy(n, base), this.asset);
	}

	override dividedBy(n: BigNumber.Value, base?: number): Balance<T> {
		return new Balance(super.dividedBy(n, base), this.asset);
	}

	override integerValue(rm?: BigNumber.RoundingMode | undefined): Balance<T> {
		return new Balance(super.integerValue(rm), this.asset);
	}
}
