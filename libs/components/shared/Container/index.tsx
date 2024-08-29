import { PropsWithChildren } from "react";

import { Footer } from "./Footer";
import { Header } from "./Header";

export function Container({ children }: PropsWithChildren) {
	return (
		<main className="grid min-h-screen py-6">
			<div>
				<Header />
			</div>

			<div className="row-start-3 flex min-h-[45em] flex-col items-center space-y-8">
				{children}
			</div>

			<div className="row-start-4 flex items-start pt-6">
				<Footer />
			</div>
		</main>
	);
}
