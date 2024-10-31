import classNames from "@sindresorhus/class-names";
import dynamic from "next/dynamic";

import * as animationData from "../../../public/animations/loader.json";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

interface LoaderProps {
	size?: "sm" | "md" | "lg";
	className?: string;
}

export function Loader({ size = "md", className }: LoaderProps) {
	return (
		<Lottie
			className={classNames(
				className,
				{
					sm: "h-6 w-6",
					md: "h-8 w-8",
					lg: "h-12 w-12",
				}[size]
			)}
			{...{
				loop: true,
				autoplay: true,
				animationData,
				rendererSettings: {
					preserveAspectRatio: "xMidYMid slice",
				},
			}}
		/>
	);
}
