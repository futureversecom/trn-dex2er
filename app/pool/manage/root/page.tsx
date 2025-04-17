"use client";

import { Manage, Positions } from "@/libs/components/manage";
import { BackButton, YourPosition } from "@/libs/components/shared";
import { useManagePool } from "@/libs/context";

export default function Home() {
	const { xToken, yToken, resetState } = useManagePool();

	if (!xToken && !yToken) return <Positions />;

	return (
		<div className="relative">
			<BackButton onClick={resetState} />
			<div className="flex gap-x-4">
				<Manage />
				<YourPosition />
			</div>
		</div>
	);
}
