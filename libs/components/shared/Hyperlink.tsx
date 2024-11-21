import classNames from "@sindresorhus/class-names";
import Link from "next/link";
import type { AnchorHTMLAttributes } from "react";

interface HyperlinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {}

export function Hyperlink({ className, children, href, ...props }: HyperlinkProps) {
	return href?.startsWith("http") || href?.startsWith("mailto:") ? (
		<a
			{...props}
			href={href ?? ""}
			rel="noopener noreferrer"
			className={classNames(className, "cursor-pointer")}
		>
			{children}
		</a>
	) : (
		<Link
			href={href ?? ""}
			{...props}
			rel="noopener noreferrer"
			className={classNames(className, "cursor-pointer")}
		>
			{children}
		</Link>
	);
}
