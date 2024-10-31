import classNames from "@sindresorhus/class-names";
import type { ButtonHTMLAttributes } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant: "primary" | "secondary" | "tertiary" | "ghost";
	size: "sm" | "md" | "lg" | "rounded";
	chevron?: boolean;
	active?: boolean;
	icon?: JSX.Element;
}

export function Button({
	variant,
	size,
	className,
	children,
	chevron,
	active,
	icon,
	...props
}: ButtonProps) {
	return (
		<button
			{...props}
			className={classNames(
				className,
				"font-mikrobe group flex items-center justify-center rounded-md transition duration-200",
				{
					primary:
						"bg-primary-700 text-neutral-200 hover:bg-primary-600 hover:text-neutral-100 disabled:bg-neutral-400 disabled:text-neutral-500",
					secondary: active
						? "bg-neutral-300 text-primary-700"
						: "bg-neutral-200 text-neutral-500 hover:bg-neutral-100 hover:text-primary-700",
					tertiary: "border border-primary-700 bg-primary-050",
					ghost: "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-700",
				}[variant],
				{
					sm: "px-4 py-2 text-sm",
					md: "px-8 py-3 text-sm",
					lg: "w-full px-6 py-4",
					rounded: "rounded-xl p-4",
				}[size]
			)}
		>
			{icon && <span className="mr-2">{icon}</span>}

			<span className="pt-0.5">{children}</span>

			<svg
				width={11}
				height={6}
				className={classNames(
					"ml-2",
					{ hidden: !chevron },
					{
						primary: "text-neutral-100",
						secondary: active ? "text-primary-700" : "hover:text-primary-700",
						tertiary: "text-neutral-700",
						ghost: "text-neutral-700",
					}[variant]
				)}
			>
				<use xlinkHref={`/images/commons.svg#chevron-down`} />
			</svg>
		</button>
	);
}
