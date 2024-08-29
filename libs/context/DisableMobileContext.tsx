import type { PropsWithChildren } from "react";

import { useIsMobile } from "@/libs/hooks";

import { Text } from "../components/shared";

export function DisableMobileProvider({ children }: PropsWithChildren) {
	const isMobile = useIsMobile();

	if (!isMobile) return children;

	return (
		<Text variant="body" size="lg" className="w-[75%] text-center font-semibold text-primary-700">
			New mobile version coming soon
		</Text>
	);
}
