import { Hyperlink } from "../shared";

interface PageButtonProps {
	page: string;
	href: string;
}

export function PageButton({ page, href }: PageButtonProps) {
	return (
		<Hyperlink
			href={href}
			className="group flex justify-between border-r border-t border-primary-700 p-8 pb-16 text-left last:border-r-0 hover:bg-primary-700 hover:text-neutral-100"
		>
			<p>{page}</p>

			<svg width={85} height={85} className="mr-6 mt-6 opacity-0 group-hover:opacity-100">
				<use href="/images/commons.svg#arrow-diagonal" />
			</svg>
		</Hyperlink>
	);
}
