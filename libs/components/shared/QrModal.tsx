import Image from "next/image";
import * as React from "react";

import { Modal, Text } from "./";

const PLACEHOLDER_QR =
	"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAAXNSR0IArs4c6QAAA/xJREFUOE+tVF0o7HkYfuZwMMsUpSHylUHUmfGtfK1FHHV8Jkrsxjnl48KRm3UuDDMSeyFFyYX2FOJSIcoaFwpJzBgl5GsUs2N9M3MM8d/eF2dW297t7+L/8ft43ud93uf9iQRBEACAHqLnJ/3/8/PVrwAIItr7PCuIbP8CIBKER2FoaBj6VT3EzmI8PgiwWm/x6eNHyIJkMJstcHZ25gDHf5mg0+pg//Ytpqam4OjoiDdv7PDNYoFcIUdJSQkBCkJDQwP8/f1hsVjg5uYGvX4NKT/9CImLBONjYyj7+Rdm/+uXLwjw80dCUiK0y8uQy+U4PT+H8w9i7O0b8Ft7+xOgSq2CxMUFanULIiMikZaeBrFYjJ6eHsTHxyMwMBCXFxf4/etXvM98jw/ZH3BgMOAPjQba5RUolUrc3FxDqWx6AmxqamKGAwMDCFcoIJV6wMHRAWq1Gp/rPkPsJIbJZILReIR37+Tw9vLCnyYTz62urqKsrAz7+/tQNatsKVutVri7u8POzg46nQ6xsbEYHx9n6RUKBetFg95BQUG8Fh4ejoeHB5ycnPB8+0vKMzMzODo6wvHxMW9wcnJCcHAwtra2EBkZCYPB8FQYAMPDwygvL+e129tbJuDr68tBKRCn/ALY3NyMsLAwPkjahYaGMltiYjQaUVBQgIWFBc6ku7ubi0ijo6ODwWgwoNlsRnV1NUZHR5GcnIyUlBRcX19zGklJSVhZWUFjYyNycnKwsbGBhIQEFBYWgmQiphRIq9UiMzPTxpAib25u8oGWlhbs7e3h/v4eS0tLuLu7w+7uLioqKnhubm4Orq6uiIuLY1B6n5+fIzU11VblkJAQ9Pf38+Gamhpsb2+zbmdnZ7C3t2fWNCgQHSZQBwcHXFxcwMvLC1lZWcjNzbVVOTs7G1KplG1AwBEREazVyMgIAxFrSp3kIXanp6eoq6vD5OQkqDHofGdn5xNga2srioqKWFiq9ODgIDw9PdHX14eDgwNER0cz4NjYGGs2PT0NmUzGxaKUCZxYvrINFUEikTAbSpO+X4Te2dlhcJLj5uaGjUwtSl6ktOfn57nSr1KmSJQK6bW2tsYVPTw8RF5eHoNUVlayTldXV4iKiuKAlG5iYiK6urpQW1uL0tLSf7ceGdTDw4MNq9Fo2It0CZDxieHi4iJnQJKsr68jPT2d+97Hxwf19fXPl4NKxRGpd6kz0tJslwO1VVVVFYqLi+Ht7Y3Ly0sMDQ1xd9BaQEAAO4J6ube397+uLz1iYmIwOzv7nVlbWxsmJibY8MSY1vLz87n9Xrz5vcoUUa/XM/XHx0euXEZGBh+mlqNBLMkBxJDMTnv8/Py4FYkpBaEeZ9vwif9p/A3nOVng63NGagAAAABJRU5ErkJggg==";

interface QrModalProps {
	open: boolean;
	qr?: string;
	onClose: () => void;
}

export function QrModal({ open, qr, onClose }: QrModalProps) {
	return (
		<Modal open={open} onClose={onClose} heading="Sign Transaction">
			<Text variant="body">Sign the request in Xaman wallet, or scan the QR code to continue</Text>
			<Image
				className="mx-auto"
				src={qr ?? PLACEHOLDER_QR}
				alt="XRP QR code"
				height={200}
				width={200}
			/>
		</Modal>
	);
}
