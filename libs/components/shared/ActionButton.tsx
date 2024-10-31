import { useCallback, useMemo } from "react";

import { useWallets } from "@/libs/context";

import { Button, type ButtonProps } from "./Button";

interface ActionButton extends Omit<ButtonProps, "variant" | "size"> {
	text: string;
	onClick: () => void;
}

export function ActionButton({ text, onClick, disabled, ...props }: ActionButton) {
	const { isConnected, connect, setIsXrplWalletSelectOpen, network } = useWallets();

	const isDisabled = useMemo(() => (!isConnected ? false : disabled), [disabled, isConnected]);

	const onButtonClick = useCallback(() => {
		if (isConnected) return onClick();

		if (network === "root") return connect();

		setIsXrplWalletSelectOpen(true);
	}, [isConnected, connect, onClick, setIsXrplWalletSelectOpen, network]);

	return (
		<Button {...props} size="lg" variant="primary" disabled={isDisabled} onClick={onButtonClick}>
			{isConnected ? text : "connect wallet"}
		</Button>
	);
}
