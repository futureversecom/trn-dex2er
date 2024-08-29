import Image from "next/image";

export type TokenImage = {
	symbol: string;
	size?: number | `${number}`;
	alt?: string;
	className?: string;
};

export function TokenImage({ symbol, size = 24, alt = "token icon", className }: TokenImage) {
	return (
		<Image
			src={`/images/${symbol?.toLocaleLowerCase().replace("sepolia", "")}.svg`}
			width={size}
			height={size}
			alt={alt}
			onError={(e) => {
				// @ts-ignore
				e.target.src = "/images/default-token.svg";
			}}
			className={className}
		/>
	);
}
