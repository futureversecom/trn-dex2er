import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { SxProps, Theme } from "@mui/material";
import { FC, PropsWithChildren, useCallback, useState } from "react";

import { Button } from "./Button";

interface CopyButtonProps {
	value: string;
	sx?: SxProps<Theme>;
}

export const CopyButton: FC<PropsWithChildren<CopyButtonProps>> = ({ children, value }) => {
	const [copying, setCopying] = useState(false);

	const copyAddress = useCallback(() => {
		void navigator.clipboard.writeText(value);
		if (!copying) {
			setCopying(true);
			setTimeout(() => {
				setCopying(false);
			}, 3000);
		}
	}, [value, copying]);

	return (
		<Button variant="ghost" size="sm" onClick={() => copyAddress()}>
			<ContentCopyIcon color={copying ? "success" : "inherit"} />
			{children}
		</Button>
	);
};
