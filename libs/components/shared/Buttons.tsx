import classNames from "@sindresorhus/class-names";
import { type HTMLAttributes, useEffect, useState } from "react";

import { Button, type ButtonProps } from "./Button";

interface ButtonsProps extends HTMLAttributes<HTMLDivElement> {
	activeIndex?: number;
	buttons: Omit<ButtonProps, "variant" | "size">[];
}

export function Buttons({ activeIndex, buttons }: ButtonsProps) {
	const [active, setActive] = useState(activeIndex ?? 0);

	useEffect(() => {
		if (typeof activeIndex === "undefined") return;

		setActive(activeIndex);
	}, [activeIndex]);

	return (
		<div className="mx-auto flex max-w-fit rounded-md bg-neutral-200 p-1">
			{buttons.map(({ onClick, ...props }, i) => (
				<Button
					key={i}
					size="md"
					variant="secondary"
					onClick={(e) => {
						onClick?.(e);
						setActive(i);
					}}
					active={active === i}
					className={classNames(
						i === 0
							? "rounded-r-none"
							: i === buttons.length - 1
								? "rounded-l-none"
								: "rounded-y-none"
					)}
					{...props}
				/>
			))}
		</div>
	);
}
