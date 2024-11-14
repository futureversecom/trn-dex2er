import { usePathname, useRouter } from "next/navigation";

import { Buttons } from "@/libs/components/shared";
import { useWallets } from "@/libs/context";

const networks: Array<"root" | "xrpl"> = ["root", "xrpl"];

const pages = [
	{
		children: "add liquidity",
		href: "/pool/add",
	},
	{
		children: "create pair",
		href: "/pool/create",
	},
	{
		children: "manage positions",
		href: "/pool/manage",
	},
];

export function Nav() {
	const { network, setNetwork } = useWallets();
	const router = useRouter();
	const pathname = usePathname();

	const activeIndex = pages.findIndex((page) => pathname.includes(page.href));

	return (
		<>
			<Buttons
				activeIndex={networks.indexOf(network)}
				buttons={networks.map((network) => ({
					children: `${network} network`,
					onClick: () => {
						let newPath = pathname.split("/");
						newPath[3] = network;
						const path = newPath.join("/");
						setNetwork(network);
						router.push(path);
					},
				}))}
			/>
			<Buttons
				activeIndex={activeIndex}
				buttons={pages.map(({ href, ...page }) => ({
					...page,
					onClick: () => {
						const path = href + "/" + network;
						router.push(path);
					},
				}))}
			/>
		</>
	);
}
