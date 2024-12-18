import { useMemo } from "react";

import { UserAuthenticationMethod } from "@/libs/hooks";
import { shortenAddress } from "@/libs/utils";

import { Button } from "./Button";
import { CopyButton } from "./CopyButton";
import { Text } from "./Text";

export type WalletProfileModalProps = {
	futurePassAddress: string;
	auth: UserAuthenticationMethod;
	handleLogout: () => void;
};

type AccountInfo = {
	title: string;
	value: string;
	copiable: boolean;
	shouldTruncateValue: boolean;
};

export default function WalletProfileModal({
	futurePassAddress,
	auth,
	handleLogout,
}: WalletProfileModalProps): JSX.Element {
	const accountInfo = useMemo<AccountInfo | undefined>(() => {
		if (!auth) return;
		switch (auth.method) {
			case "wagmi": {
				return {
					title: "non-custodial wallet",
					value: auth.eoa,
					copiable: true,
					shouldTruncateValue: true,
				};
			}

			case "xaman": {
				return {
					title: "xaman wallet",
					value: auth.rAddress,
					copiable: true,
					shouldTruncateValue: true,
				};
			}

			case "fv:email": {
				return {
					title: "email",
					value: auth.email,
					copiable: false,
					shouldTruncateValue: false,
				};
			}

			default: {
				throw new Error(`This should be unreachable! Found invalid loginType`);
			}
		}
	}, [auth]);

	return (
		<div className="flex h-full w-full flex-1 flex-col justify-between rounded-lg border border-solid bg-[#1d1e20] px-4 py-6 md:w-[258px]">
			<div className="flex flex-col gap-4">
				<div className="flex flex-col gap-2">
					<Text variant="body" size="sm" color="textSecondary">
						YOUR FUTUREPASS ADDRESS
					</Text>
					<CopyButton
						value={futurePassAddress}
						sx={{ display: "flex", alignItems: "center", gap: 1 }}
					>
						{shortenAddress(futurePassAddress)}
					</CopyButton>
				</div>
			</div>
			{accountInfo != null && (
				<div className="flex flex-col gap-4">
					<div className="flex flex-col gap-2">
						<Text variant="body" size="sm" color="textSecondary">
							{`SIGNED IN WITH ${accountInfo.title}`}
						</Text>
						{accountInfo.copiable ? (
							<CopyButton
								value={accountInfo.value}
								sx={{ display: "flex", alignItems: "center", gap: 1 }}
							>
								{accountInfo.shouldTruncateValue
									? shortenAddress(accountInfo.value)
									: accountInfo.value}
							</CopyButton>
						) : (
							<Text className="max-w-[180px] overflow-hidden break-words" variant="body">
								{accountInfo.shouldTruncateValue
									? shortenAddress(accountInfo.value)
									: accountInfo.value}
							</Text>
						)}
					</div>
				</div>
			)}
			<Button variant="primary" size="md" onClick={handleLogout} className="mt-8" color="error">
				Logout
			</Button>
		</div>
	);
}
