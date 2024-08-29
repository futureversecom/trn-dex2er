import type { ReactNode } from "react";

import { Text, Tooltip } from "./";

interface InfoItemProps {
	heading: ReactNode;
	tip?: string;
	value: string;
}

export function InfoItem({ heading, tip, value }: InfoItemProps) {
	return (
		<div className="flex justify-between">
			<span className="flex items-center gap-2 text-base text-neutral-600">
				{heading}

				{tip && <Tooltip id={tip} tip={tip} />}
			</span>

			<Text size="md">{value}</Text>
		</div>
	);
}
