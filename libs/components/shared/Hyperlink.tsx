import classNames from "@sindresorhus/class-names";
import type { AnchorHTMLAttributes } from "react";

interface HyperlinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {}

export function Hyperlink({ className, children, target = "_blank", ...props }: HyperlinkProps) {
	return (
		<a
			{...props}
			target={target}
			rel="noopener noreferrer"
			className={classNames(className, "cursor-pointer")}
		>
			{children}
		</a>
	);
}
