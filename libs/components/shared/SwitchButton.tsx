import { MouseEventHandler } from "react";

import { Button } from "./";

interface SwitchButtonProps {
	onClick: MouseEventHandler<HTMLButtonElement>;
}

export function SwitchButton(props: SwitchButtonProps) {
	return (
		<Button variant="tertiary" size="rounded" {...props}>
			<svg width="16" height="16">
				<use xlinkHref="/images/commons.svg#switch" />
			</svg>
		</Button>
	);
}
