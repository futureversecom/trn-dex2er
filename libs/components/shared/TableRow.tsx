import classNames from "@sindresorhus/class-names";
import { type HTMLAttributes } from "react";

interface TableRowProps extends HTMLAttributes<HTMLDivElement> {
	items: Array<React.ReactNode>;
}

export function TableRow({ items, className, ...props }: TableRowProps) {
	return (
		<div
			className={classNames(
				className,
				"flex cursor-pointer items-center justify-stretch gap-4 border-b border-neutral-400 px-2 py-4 transition duration-200 hover:bg-neutral-400"
			)}
			{...props}
		>
			{items}
		</div>
	);
}
