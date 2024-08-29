import classNames from "@sindresorhus/class-names";
import type { HTMLAttributes, PropsWithChildren } from "react";

import { Loader } from "./Loader";

interface BoxProps extends HTMLAttributes<HTMLDivElement> {
	heading: string;
	isLoading?: boolean;
}

export function Box({
	className,
	children,
	heading,
	isLoading,
	...props
}: PropsWithChildren<BoxProps>) {
	return (
		<div
			className={classNames(className, "min-w-[40em] max-w-4xl rounded-2xl bg-neutral-200 p-8")}
			{...props}
		>
			<div className="flex w-full justify-between">
				<h1 className="font-mikrobe pb-6 text-4xl text-neutral-700">{heading}</h1>

				{isLoading && <Loader />}
			</div>
			<div className="space-y-4">{children}</div>
		</div>
	);
}
