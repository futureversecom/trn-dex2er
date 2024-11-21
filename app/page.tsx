import { PageButton } from "@/libs/components/home";

export default function Home() {
	return (
		<>
			<svg className="aspect-[120/22] w-[calc(100vw-48px)] text-neutral-100">
				<use xlinkHref="/logo-primary.svg#row" />
			</svg>

			<p className="ml-auto mr-32 max-w-[400px] text-sm text-primary-700">
				Dexter is a quick swap exchange.
				<br />
				Swap any token on The Root Network, or provide liquidity to pools and earn fees on swaps
			</p>

			<div className="font-mikrobe grid h-[15rem] w-full grid-cols-3 text-[96px] text-primary-700">
				<PageButton page="SWAP" href="/swap" />
				<PageButton page="POOL" href="/pool/add" />
				<PageButton page="BRIDGE" href="/bridge" />
			</div>
		</>
	);
}
