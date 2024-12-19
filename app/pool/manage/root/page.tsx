"use client";

import { Manage, Positions } from "@/libs/components/manage";
import { BackButton, Box, Text, YourPosition } from "@/libs/components/shared";
import { useManagePool, useTrnTokens, useWallets } from "@/libs/context";
import { useDebouncedValue } from "@/libs/hooks";

export default function Home() {
	const { isConnected } = useWallets();
	const { isFetching, positions } = useTrnTokens();
	const { xToken, yToken, resetState } = useManagePool();
	const deBouncedIsFetching = useDebouncedValue(isFetching, 200);

	if (!xToken && !yToken)
		return (
			<Box heading="manage positions" className="relative" isLoading={isFetching}>
				{positions?.length > 0 ? (
					<Positions />
				) : (
					<Text>
						{!isConnected
							? "Connect wallet to continue"
							: deBouncedIsFetching
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
