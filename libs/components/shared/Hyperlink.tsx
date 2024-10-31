import classNames from "@sindresorhus/class-names";
import type { AnchorHTMLAttributes } from "react";

interface HyperlinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {}

export function Hyperlink({ className, children, ...props }: HyperlinkProps) {
	return (
		<a {...props} rel="noopener noreferrer" className={classNames(className, "cursor-pointer")}>
			{children}
		</a>
	);
}
