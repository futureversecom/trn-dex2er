import type { Config } from "tailwindcss";

const config: Config = {
	content: [
		"./pages/**/*.{js,ts,jsx,tsx,mdx}",
		"./libs/components/**/*.{js,ts,jsx,tsx,mdx}",
		"./app/**/*.{js,ts,jsx,tsx,mdx}",
	],
	theme: {
		extend: {
			aspectRatio: {
				"120/22": "120 / 22",
			},
			colors: {
				"primary-700": "#d9f27e",
				"primary-600": "#d0e976",
				"primary-500": "#b2ca5e",
				"primary-300": "#617320",
				"primary-200": "#404e10",
				"primary-100": "#2e380b",
				"primary-050": "#171c06",

				"neutral-white": "#ffffff",
				"neutral-800": "#f2f2f3",
				"neutral-700": "#d8d8d8",
				"neutral-600": "#adb2a4",
				"neutral-500": "#7a7a7a",
				"neutral-400": "#25282b",
				"neutral-300": "#1d1e20",
				"neutral-200": "#171818",
				"neutral-100": "#191a1a",

				"error-700": "#ffaaa1",

				"background": "#f6f6f8" /* Neutral/off white */,
				"light": "#e5e7eb" /* Neutral/stroke */,
				"inverted": "#171717" /* Neutral/Black */,
				"white": "#ffffff" /* Neutral/White */,
				"disabled": "#aaaaaa" /* Neutral/light gray */,
				"black": "##191a1a",

				/* Neutral/Outline */
				"neutral-outline": "#7a797d",
			},
			backgroundImage: {
				"gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
				"gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
			},
		},
	},
	plugins: [require("@tailwindcss/typography")],
};
export default config;
