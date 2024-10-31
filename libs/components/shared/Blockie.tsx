import { renderIcon } from "@download/blockies";
import Image from "next/image";
import * as React from "react";

type BlockieProps = {
	diameter: number;
	address?: string;
	className?: string;
};

export function Blockie({ address, diameter, className }: BlockieProps) {
	const [imageUrl, setImageUrl] = React.useState("");
	const canvasRef = React.useRef<HTMLCanvasElement>(null);

	React.useEffect(() => {
		const canvas = canvasRef.current;

		if (address && canvas) {
			renderIcon({ seed: address.toLowerCase() }, canvas);

			const updatedDataUrl = canvas.toDataURL();

			if (updatedDataUrl !== imageUrl) {
				setImageUrl(updatedDataUrl);
			}
		}
	}, [address, imageUrl]);

	return (
		<>
			<canvas ref={canvasRef} style={{ display: "none" }} />
			{imageUrl && (
				<Image
					src={imageUrl}
					height={diameter}
					width={diameter}
					className={className}
					alt="blockie"
				/>
			)}
		</>
	);
}
