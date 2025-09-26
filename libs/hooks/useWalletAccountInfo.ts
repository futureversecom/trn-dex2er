import { AccountBalanceWallet, Email } from "@mui/icons-material";
import * as React from "react";

import { ReactComponent as Xaman } from "../../public/images/Xaman.svg";
import { UserAuthenticationMethod } from "../types";

export type WalletAccountInfo = {
	title: string;
	icon: JSX.Element;
	value: string;
	copiable: boolean;
	shouldTruncateValue: boolean;
};

const XAMAN_ICON = React.createElement(Xaman, { width: 24 });
const EMAIL_ICON = React.createElement(Email, { sx: { fontSize: 20 } });
const USER_ICON = React.createElement("span", {}, "\u{1F464}");
const EOA = React.createElement(AccountBalanceWallet, { sx: { fontSize: 20 } });

export function useWalletAccountInfo(auth: UserAuthenticationMethod): WalletAccountInfo | null {
	return React.useMemo<WalletAccountInfo | null>(() => {
		switch (auth.method) {
			case "wagmi":
				return {
					title: "non-custodial wallet",
					icon: EOA,
					value: auth.eoa,
					copiable: true,
					shouldTruncateValue: true,
				};
			case "xaman":
				return {
					title: "xaman wallet",
					icon: XAMAN_ICON,
					value: auth.rAddress,
					copiable: true,
					shouldTruncateValue: true,
				};
			case "fv:email":
				return {
					title: "email",
					icon: EMAIL_ICON,
					value: auth.email,
					copiable: false,
					shouldTruncateValue: false,
				};
			case "fv:dynamic-custodial-idp": {
				const darkIcon = auth.darkIcon;
				const lightIcon = auth.lightIcon;
				const name = auth.name;
				const email = auth.email;
				const iconUrl = darkIcon ?? lightIcon;

				return {
					title: auth.name ?? "Unknown",
					icon: iconUrl
						? React.createElement("img", {
								src: iconUrl,
								alt: "icon",
								style: { height: "20px", width: "auto" },
							})
						: USER_ICON,
					value: email ?? name ?? "",
					copiable: false,
					shouldTruncateValue: false,
				};
			}

			default: {
				throw new Error(`This should be unreachable! Found invalid loginType`);
			}
		}
	}, [auth]);
}
