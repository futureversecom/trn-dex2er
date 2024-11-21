import classNames from "@sindresorhus/class-names";

export interface SelectedToken {
	variant: "primary" | "secondary";
	size: "sm" | "md" | "lg" | "rounded";
	active?: boolean;
	icon?: JSX.Element;
	className?: string;
	children: React.ReactNode;
}

export function SelectedToken({ variant, size, className, children, active, icon }: SelectedToken) {
	return (
		<div
			className={classNames(
				className,
				"font-mikrobe group flex items-center justify-center rounded-md transition duration-200",
				{
					primary: "bg-primary-700 text-neutral-200",
					secondary: active ? "bg-neutral-300 text-primary-700" : "bg-neutral-200 text-neutral-500",
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
		</div>
	);
}
