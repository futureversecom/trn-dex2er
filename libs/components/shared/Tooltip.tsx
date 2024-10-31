import { Tooltip as ReactTooltip } from "react-tooltip";

interface TooltipProps {
	id: string;
	tip: string;
}

export function Tooltip({ id, tip }: TooltipProps) {
	return (
		<>
			<svg width={15} height={16} data-tooltip-id={id}>
				<use xlinkHref="/images/commons.svg#info" />
			</svg>
			<ReactTooltip
				id={id}
				noArrow
				place="right"
				content={tip}
				className="max-w-sm rounded-lg bg-neutral-800 p-2 text-neutral-100"
			/>
		</>
	);
}
