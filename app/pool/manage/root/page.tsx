"use client";

import { Manage, Positions } from "@/libs/components/manage";
import { BackButton, Box, Text, YourPosition } from "@/libs/components/shared";
import { useManagePool, useTrnTokens, useWallets } from "@/libs/context";

export default function Home() {
	const { isConnected } = useWallets();
	const { isFetching, pools } = useTrnTokens();
	const { xToken, yToken, resetState } = useManagePool();

	if (!xToken && !yToken)
		return (
			<Box heading="manage positions" className="relative" isLoading={isFetching}>
				{!pools?.length ? (
					<Positions />
				) : (
					<Text>
						{!isConnected
							? "Connect wallet to continue"
							: isFetching
								? "Fetching positions"
								: "No positions found"}
					</Text>
				)}
			</Box>
		);

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
