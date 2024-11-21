"use client";

import { XrplManage, XrplPositions } from "@/libs/components/manage";
import { Text } from "@/libs/components/shared";
import { Box } from "@/libs/components/shared";
import { useManageXrplPool } from "@/libs/context";
import { useXrplCurrencies } from "@/libs/context";
import { useWallets } from "@/libs/context";

export default function Home() {
	const { isConnected } = useWallets();
	const { xToken, yToken } = useManageXrplPool();
	const { isFetching, positions } = useXrplCurrencies();

	if (!xToken && !yToken)
		return (
			<Box heading="manage positions" className="relative" isLoading={isFetching}>
				{positions?.length ? (
					<XrplPositions hasBalance={true} />
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
		<>
			{/* <XrplManage /> */}
			<XrplManage />
		</>
	);
}
