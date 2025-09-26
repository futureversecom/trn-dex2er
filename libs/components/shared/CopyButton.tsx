import { CheckCircle, ContentCopy } from "@mui/icons-material";
import { Box } from "@mui/material";
import { FC, PropsWithChildren } from "react";
import * as React from "react";

export type CopyButtonProps = {
	didCopy?: boolean;
	value: string;
	sx?: React.ComponentProps<typeof Box>["sx"];
	onlyIconChange?: boolean;
	showTooltip?: boolean;
	onBypass?: () => void;
	children: React.ReactNode;
};

export const CopyButton: FC<PropsWithChildren<CopyButtonProps>> = ({
	value,
	children,
	onBypass,
	sx,
	...rest
}) => {
	const [copied, setCopied] = React.useState(() => {
		return rest.didCopy ?? false;
	});

	const iconColor = React.useMemo(() => {
		if (sx && typeof sx === "object" && "color" in sx) {
			return sx.color as string;
		}
		return undefined;
	}, [sx]);

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(value);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
			onBypass?.();
		} catch (err) {
			console.error("Failed to copy:", err);
		}
	};

	return (
		<Box
			onClick={handleCopy}
			sx={{
				cursor: "pointer",
				display: "flex",
				alignItems: "center",
				...sx,
			}}
		>
			{children}
			{copied ? (
				<CheckCircle sx={{ ml: 0.5, fontSize: 16, color: iconColor || "success.main" }} />
			) : (
				<ContentCopy sx={{ ml: 0.5, fontSize: 16, color: iconColor || "text.secondary" }} />
			)}
		</Box>
	);
};
