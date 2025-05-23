import classNames from "@sindresorhus/class-names";
import type { PropsWithChildren } from "react";

import type { ContextTag } from "@/libs/types";

import { Button, Hyperlink, Loader, Modal, Text } from "./";
import type { ErrorSeverity } from "./";

interface ConfirmModalProps extends PropsWithChildren {
	tag?: ContextTag;
	onClose: () => void;
	onConfirm: () => void;
	description: string;
	explorerUrl?: string;
	error?: string;
	errorSeverity?: ErrorSeverity;
	title: string;
}

export function ConfirmModal({
	tag,
	onClose,
	onConfirm,
	description,
	explorerUrl,
	error,
	title,
	children,
}: ConfirmModalProps) {
	return (
		<Modal
			open={!!tag && tag !== "sign"}
			onClose={tag === "submit" ? undefined : onClose}
			className={classNames(tag === "review" && "!w-[40em]")}
			heading={tag === "review" ? title : tag}
		>
			{tag === "review" && (
				<Confirm description={description} onConfirm={onConfirm}>
					{children}
				</Confirm>
			)}
			<div className="flex flex-col items-center gap-6">
				{tag === "submit" && <Submit />}
				{tag === "submitted" && <Submitted explorerUrl={explorerUrl!} />}
				{tag === "failed" && <Failed error={error} />}
			</div>
		</Modal>
	);
}

function Confirm({
	description,
	onConfirm,
	children,
}: {
	description: string;
	onConfirm: () => void;
	children: React.ReactNode;
}) {
	return (
		<>
			<Text variant="body">{description}</Text>
			<div className="space-y-2">{children}</div>
			<Button variant="primary" size="lg" onClick={onConfirm} className="!-mb-4">
				confirm
			</Button>
		</>
	);
}

function Submit() {
	return (
		<>
			<Loader size="lg" />
			<Text variant="body" size="lg" className="font-semibold">
				Transaction submitting
			</Text>
		</>
	);
}

function Submitted({ explorerUrl }: { explorerUrl: string }) {
	return (
		<>
			<svg width={56} height={56}>
				<use xlinkHref="/images/commons.svg#success" />
			</svg>
			<Text variant="body" size="lg" className="font-semibold">
				Transaction submitted
			</Text>
			<Text variant="body" size="md">
				View on{" "}
				<Hyperlink href={explorerUrl} target="_blank" className="underline">
					Explorer
				</Hyperlink>
			</Text>
		</>
	);
}

function Failed({ error }: { error?: string }) {
	return (
		<>
			<svg width={56} height={56}>
				<use xlinkHref="/images/commons.svg#error" />
			</svg>
			<Text variant="body" size="md">
				{error ?? "Try again later"}
			</Text>
		</>
	);
}
