"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useIsMounted } from "@/libs/hooks";
import { getRedirectLocation } from "@/libs/utils";

export default function FuturePassRedirect() {
	const { replace } = useRouter();
	const isMounted = useIsMounted();

	useEffect(() => {
		if (!isMounted) return;

		replace(getRedirectLocation());
	}, [replace, isMounted]);
}
