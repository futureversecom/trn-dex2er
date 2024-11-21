import { usePathname, useRouter } from "next/navigation";

import { Buttons } from "@/libs/components/shared";

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
	{
		children: "token liquidity",
		href: "/pool/browse",
	},
];

export function Nav() {
	const router = useRouter();
	const pathname = usePathname();

	const activeIndex = pages.findIndex((page) => pathname.includes(page.href));

	return (
		<Buttons
			activeIndex={activeIndex}
			buttons={pages.map(({ href, ...page }) => ({
				...page,
				onClick: () => {
					router.push(href);
				},
			}))}
		/>
	);
}
