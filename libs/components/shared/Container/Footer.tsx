import classNames from "@sindresorhus/class-names";

import { useIsMobile } from "@/libs/hooks";

import { Hyperlink } from "../Hyperlink";
import { Text } from "../Text";

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
				<Hyperlink
					className="underline"
					href={"https://support.therootnetwork.com/en/collections/11128260-dexter"}
					target="_blank"
				>
					SUPPORT
				</Hyperlink>
			</span>

			<Text>Version 1.2.2</Text>

			<span>&copy; Dexter {new Date().getFullYear()}</span>
		</footer>
	);
}
