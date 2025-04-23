import React from "react";

import { Text } from "./Text";

export type ErrorSeverity = "error" | "warning" | "info";

interface ErrorMessageProps {
	message?: string;
	severity?: ErrorSeverity;
	className?: string;
}

export function ErrorMessage({ message, severity = "error", className = "" }: ErrorMessageProps) {
	if (!message) return null;

	const colors = {
		error: "text-red-300 bg-red-900/20",
		warning: "text-yellow-300 bg-yellow-900/20",
		info: "text-blue-300 bg-blue-900/20",
	};

	const icons = {
		error: "⚠️",
		warning: "⚠️",
		info: "ℹ️",
	};

	return (
		<div className={`mb-4 rounded-md p-3 ${colors[severity]} ${className}`}>
			<div className="flex">
				<div className="mr-2 flex-shrink-0">{icons[severity]}</div>
				<div className="flex-grow">
					<Text className="text-inherit" size="md">
						{message}
					</Text>
				</div>
			</div>
		</div>
	);
}
