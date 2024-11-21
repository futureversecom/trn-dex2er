import classNames from "@sindresorhus/class-names";

import { useIsMobile } from "@/libs/hooks";

import { Hyperlink } from "../Hyperlink";

export function Footer() {
	const isMobile = useIsMobile();

	return (
		<footer
			className={classNames(
				"flex w-full justify-between text-primary-700",
				isMobile ? "px-8" : "px-24"
			)}
		>
			<span>
				<b>NEED HELP?</b>&nbsp;Get in touch for&nbsp;
				<Hyperlink className="underline" href={"mailto:support@therootnetwork.com"} target="_blank">
					support
				</Hyperlink>
			</span>

			<span>&copy; Dexter {new Date().getFullYear()}</span>
		</footer>
	);
}
