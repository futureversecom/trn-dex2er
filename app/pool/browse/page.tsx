"use client";

import { Pools } from "@/libs/components/pool/Pools";
import { Box } from "@/libs/components/shared";
import { useTrnTokens } from "@/libs/context";

export default function Home() {
	const { isFetching } = useTrnTokens();

	return (
		<Box heading="pools" isLoading={isFetching}>
			<Pools />
		</Box>
	);
}
