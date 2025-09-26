import { useAuth } from "@futureverse/auth-react";
import { Logout } from "@mui/icons-material";
import { Box, IconButton } from "@mui/material";
import * as React from "react";

import { useWalletAccountInfo } from "@/libs/hooks";
import { UserAuthenticationMethod } from "@/libs/types";
import { truncateAddress } from "@/libs/utils";

import type { WalletAccountInfo } from "../../hooks/useWalletAccountInfo";
import { Button } from "./Button";
import { CopyButton } from "./CopyButton";
import { Text } from "./Text";

export type WalletProfileModalProps = {
	futurePassAddress: `0x${string}`;
	auth: UserAuthenticationMethod;
	handleClose: () => void;
	handleLogout: () => void;
	didCopy?: boolean;
	onFuturePassCopy?: () => void;
	futurePassDidCopy?: boolean;
	onFuturePassCopyStateChange?: (didCopy: boolean) => void;
};

export type AccountInfo = WalletAccountInfo;

function WalletProfileModal({
	futurePassAddress,
	auth,
	handleClose,
	handleLogout,
	didCopy,
	onFuturePassCopy,
	futurePassDidCopy,
	onFuturePassCopyStateChange,
}: WalletProfileModalProps): JSX.Element {
	const { userSession } = useAuth();

	const accountInfo = useWalletAccountInfo(auth);

	const styledIcon = React.useMemo(() => {
		if (!accountInfo?.icon) return null;

		if (React.isValidElement(accountInfo.icon) && accountInfo.icon.type === "img") {
			return React.cloneElement(
				accountInfo.icon as React.ReactElement<React.ImgHTMLAttributes<HTMLImageElement>>,
				{
					style: {
						...(accountInfo.icon.props as React.ImgHTMLAttributes<HTMLImageElement>)?.style,
						filter: "brightness(0) invert(1)",
					},
				}
			);
		}

		return React.cloneElement(accountInfo.icon, { style: { color: "white" } });
	}, [accountInfo?.icon]);

	return (
		<div className="flex h-full w-full min-w-[258px] flex-col justify-between rounded-md bg-neutral-300 p-6">
			<div className="flex flex-col gap-4">
				<div className="flex items-center justify-between pb-4">
					<Text variant="heading" size="xl" className="font-mikrobe text-primary-700">
						DEXTER
					</Text>

					{/* Close Button */}
					<IconButton aria-label="Close" onClick={handleClose}>
						<Box
							component="span"
							sx={{
								display: "flex",
								alignItems: "center",
								maxWidth: "24px",
								color: "#d8d8d8",
								fontSize: "24px",
								justifyContent: "center",
							}}
							data-testid="icon-font-close"
						>
							<svg
								viewBox="0 0 24 24"
								fill="currentColor"
								style={{ width: "100%", height: "100%" }}
							>
								<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
							</svg>
						</Box>
					</IconButton>
				</div>
				<div className="space-y-6">
					<div className="flex flex-col gap-3">
						<Text variant="heading" size="sm" className="font-mikrobe uppercase text-neutral-500">
							Your futurepass address
						</Text>
						<div className="flex items-center justify-between rounded-lg border border-neutral-600 bg-neutral-200 px-4 py-3">
							<Text size="md" className="overflow-hidden font-bold text-neutral-700">
								{truncateAddress(futurePassAddress)}
							</Text>
							<CopyButton
								didCopy={futurePassDidCopy || didCopy}
								value={futurePassAddress}
								sx={{ display: "flex", alignItems: "center", minWidth: "24px", color: "white" }}
								onlyIconChange
								showTooltip={false}
								onBypass={() => {
									onFuturePassCopy?.();
									onFuturePassCopyStateChange?.(true);
								}}
							>
								<span></span>
							</CopyButton>
						</div>
					</div>
					{accountInfo != null && (
						<div className="flex flex-col gap-3">
							<Text variant="heading" size="sm" className="font-mikrobe uppercase text-neutral-500">
								{`Signed in with ${accountInfo.title}`}
							</Text>
							<div className="flex items-center justify-between rounded-lg border border-neutral-600 bg-neutral-200 px-4 py-3">
								<div className="flex items-center gap-3">
									{styledIcon}
									<Text size="sm" className="overflow-hidden font-bold text-neutral-700">
										{accountInfo.shouldTruncateValue
											? truncateAddress(accountInfo.value)
											: accountInfo.value}
									</Text>
								</div>
								{accountInfo.copiable && (
									<CopyButton
										value={accountInfo.value}
										sx={{
											display: "flex",
											alignItems: "center",
											minWidth: "24px",
											color: "white",
										}}
										onlyIconChange
										showTooltip={false}
									>
										<span></span>
									</CopyButton>
								)}
							</div>
						</div>
					)}
				</div>
			</div>
			<div className="mt-16 flex flex-col gap-6">
				<Button
					variant="secondary"
					size="md"
					onClick={handleLogout}
					icon={<Logout sx={{ fontSize: 18 }} />}
				>
					Logout
				</Button>
			</div>
		</div>
	);
}

export default WalletProfileModal;
