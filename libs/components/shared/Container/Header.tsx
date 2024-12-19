import classNames from "@sindresorhus/class-names";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";

import { useWallets } from "@/libs/context";
import { useIsMobile } from "@/libs/hooks";

import { Button, Dropdown, Hyperlink, Text } from "../";
import { ConnectTrnButton } from "./ConnectTrnButton";
import { ConnectXrplButton } from "./ConnectXrplButton";

const pageMap = {
	SWAP: "/swap",
	POOL: "/pool/add/root",
	BRIDGE: "/bridge",
};

export function Header() {
	const pathname = usePathname();
	const router = useRouter();
	const isMobile = useIsMobile();
	const { network, setNetwork } = useWallets();

	const networks = [
		{
			value: "root",
			element: (
				<span className="flex items-center gap-2">
					<Image src="/images/root.svg" width={24} height={24} alt="dexter icon" />
					<Text variant="heading">ROOT</Text>
				</span>
			),
		},
		{
			value: "xrpl",
			element: (
				<span className="flex items-center gap-2">
					<Image src="/images/xrpl-network.svg" width={24} height={24} alt="dexter icon" />
					<Text variant="heading">XRPL</Text>
				</span>
			),
		},
	];

	if (pathname === "/" || isMobile)
		return (
			<header className="flex w-full justify-between px-6">
				<Image src="/icon-primary.svg" width={40} height={40} alt="dexter icon" />

				{!isMobile && (
					<Hyperlink href="/swap">
						<Button variant="primary" size="md" className="!text-base">
							Launch app
						</Button>
					</Hyperlink>
				)}
			</header>
		);

	return (
		<header className="relative flex w-full justify-between px-6">
			<div className="flex space-x-20 py-1">
				<h1 className="font-mikrobe text-3xl text-primary-700">
					<Hyperlink href="/">DEXTER</Hyperlink>
				</h1>
				<span className="flex items-center space-x-8">
					{Object.entries(pageMap).map(([page, href]) => (
						<Hyperlink
							key={page}
							href={href}
							className={classNames(
								"font-mikrobe text-sm",
								pathname.includes(page.toLowerCase())
									? "bg-neutral-300 text-primary-700"
									: "text-neutral-500 hover:text-primary-700"
							)}
						>
							{page}
						</Hyperlink>
					))}
				</span>
			</div>

			<div className="flex space-x-4 rounded-lg border border-white">
				<Dropdown
					anchor="bottom start"
					className="px-4 py-2"
					itemsClassName="w-[22em]"
					current={network}
					onSelect={(network) => {
						if (pathname.includes("pool")) {
							const newPath = pathname.split("/");
							newPath[3] = network;
							const path = newPath.join("/");
							router.push(path);
						}
						setNetwork(network as "root" | "xrpl");
					}}
					options={networks}
				/>

				<span className="p-1">
					{network === "root" ? <ConnectTrnButton /> : <ConnectXrplButton />}
				</span>
			</div>
		</header>
	);
}
