import { Button } from "./Button";

export function BackButton({ onClick }: { onClick: () => void }) {
	return (
		<Button variant="secondary" size="rounded" onClick={onClick} className="absolute -left-16">
			<svg width={22} height={22}>
				<use xlinkHref="/images/commons.svg#arrow" />
			</svg>
		</Button>
	);
}
