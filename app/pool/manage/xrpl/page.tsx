"use client";

import { XrplManage, XrplPositions } from "@/libs/components/manage";
import { Text } from "@/libs/components/shared";
import { Box } from "@/libs/components/shared";
import { useManageXrplPool } from "@/libs/context";
import { useXrplCurrencies } from "@/libs/context";
import { useWallets } from "@/libs/context";
import { useDebouncedValue } from "@/libs/hooks";

export default function Home() {
	const { isConnected } = useWallets();
	const { xToken, yToken } = useManageXrplPool();
	const { isFetching, positions } = useXrplCurrencies();
	const deBouncedIsFetching = useDebouncedValue(isFetching, 200);

	if (!xToken && !yToken)
		return (
			<Box heading="manage positions" className="relative" isLoading={isFetching}>
				{positions?.length > 0 ? (
					<XrplPositions />
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
		<>
			<XrplManage />
		</>
	);
}
