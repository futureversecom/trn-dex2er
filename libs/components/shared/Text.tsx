import classNames from "@sindresorhus/class-names";
import type { HTMLAttributes } from "react";

interface TextProps extends HTMLAttributes<HTMLParagraphElement> {
	size?: "xs" | "sm" | "md" | "lg" | "xl";
	variant?: "body" | "heading";
}

export function Text({ children, className, variant = "body", size = "sm", ...props }: TextProps) {
	return (
		<p
			className={classNames(
				className,
				{
					body: "text-neutral-700",
					heading: "font-mikrobe font-semibold text-neutral-700",
				}[variant],
				{
					xs: "text-xs",
					sm: "text-sm",
					md: "text-base",
					lg: "text-xl",
					xl: "text-2xl",
				}[size]
			)}
			{...props}
		>
			{children}
		</p>
	);
}
