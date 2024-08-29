import { Button, Text } from "./";

interface PaginationProps {
	currentPage: number;
	totalPages: number;
	nextEnabled: boolean;
	previousEnabled: boolean;
	setNextPage: () => void;
	setPreviousPage: () => void;
}

export function Pagination({
	currentPage,
	totalPages,
	nextEnabled,
	previousEnabled,
	setNextPage,
	setPreviousPage,
}: PaginationProps) {
	return (
		<div className="flex items-center justify-between pt-6">
			<Text>
				Page {currentPage + 1} / {totalPages}
			</Text>

			<div className="flex items-center justify-end gap-1">
				<Button
					size="sm"
					variant="ghost"
					onClick={() => setPreviousPage()}
					disabled={!previousEnabled}
				>
					<svg width={12} height={12}>
						<use xlinkHref="/images/commons.svg#arrow" />
					</svg>
				</Button>
				<Button size="sm" variant="ghost" onClick={() => setNextPage()} disabled={!nextEnabled}>
					<svg width={12} height={12} className="rotate-180">
						<use xlinkHref="/images/commons.svg#arrow" />
					</svg>
				</Button>
			</div>
		</div>
	);
}
