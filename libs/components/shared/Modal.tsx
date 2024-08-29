import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import classNames from "@sindresorhus/class-names";
import type { PropsWithChildren } from "react";

import { Button, Text } from "./";

export interface ModalProps extends PropsWithChildren {
	open: boolean;
	onClose?: () => void;
	heading?: string;
	className?: string;
}

export function Modal({ open, onClose, heading, className, children }: ModalProps) {
	return (
		<Dialog
			open={open}
			onClose={() => {
				onClose?.();
			}}
			className="relative z-50"
		>
			<div className="fixed inset-0 flex w-screen items-center justify-center backdrop-blur-sm">
				<DialogPanel
					className={classNames(
						className,
						"w-[30em] space-y-6 rounded-md border border-neutral-600 bg-neutral-300 p-6"
					)}
				>
					<DialogTitle
						className={classNames("flex items-center", heading ? "justify-between" : "justify-end")}
					>
						{heading && (
							<Text variant="heading" className="text-primary-700" size="xl">
								{heading}
							</Text>
						)}
						<Button
							variant="ghost"
							size="sm"
							className="-mr-4 -mt-2 text-primary-700"
							onClick={onClose}
						>
							<svg width="14" height="14">
								<use xlinkHref="/images/commons.svg#cross" />
							</svg>
						</Button>
					</DialogTitle>

					{children}
				</DialogPanel>
			</div>
		</Dialog>
	);
}
