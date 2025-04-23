import type { ReactNode } from "react";

import { Text, Tooltip } from "./";

interface InfoItemProps {
	heading: ReactNode;
	tip?: string;
	value: string;
	className?: string;
}

export function InfoItem({ heading, tip, value, className = "" }: InfoItemProps) {
	return (
		<div className={`flex justify-between ${className}`}>
			<span className="flex items-center gap-2 text-base text-neutral-600">
				{heading}

				{tip && <Tooltip id={tip} tip={tip} />}
			</span>

			<Text size="md">{value}</Text>
		</div>
	);
}
