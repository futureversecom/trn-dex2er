import { useLayoutEffect, useState } from "react";

export function useIsMobile() {
	const [isMobile, setIsMobile] = useState(false);

	useLayoutEffect(() => {
		setIsMobile(window?.innerWidth <= 768);

		const resizeHandler = () => {
			setIsMobile(window?.innerWidth <= 768);
		};

		window.addEventListener("resize", resizeHandler);
		return () => window.removeEventListener("resize", resizeHandler);
	}, []);

	return isMobile;
}
