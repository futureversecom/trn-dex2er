import Image from "next/image";
import { Tooltip } from "react-tooltip";

export type TokenImage = {
	symbol?: string;
	size?: number | `${number}`;
	alt?: string;
	className?: string;
	issuer?: string;
};

export function TokenImage({
	symbol,
	size = 24,
	alt = "token icon",
	className,
	issuer,
}: TokenImage) {
	if (issuer) {
		return (
			<>
				<a
					data-tooltip-id={`${issuer} - ${symbol}`}
					data-tooltip-content={`issuer: ${issuer}`}
					data-tooltip-place="top"
				>
					<Image
						src={`/images/${symbol?.toLocaleLowerCase().replace("sepolia", "")}.svg`}
						width={size}
						height={size}
						alt={alt}
						onError={(e) => {
							// @ts-expect-error ...
							e.target.src = "/images/default-token.svg";
						}}
						className={className}
					/>
				</a>
				<Tooltip id={`${issuer} - ${symbol}`} />
			</>
		);
	}
	return (
		<Image
			src={`/images/${symbol?.toLocaleLowerCase().replace("sepolia", "")}.svg`}
			width={size}
			height={size}
			alt={alt}
			onError={(e) => {
				// @ts-expect-error ...
				e.target.src = "/images/default-token.svg";
			}}
			className={className}
		/>
	);
}
