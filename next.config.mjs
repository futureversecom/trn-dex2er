/** @type {import('next').NextConfig} */
const nextConfig = {
	swcMinify: false,

	transpilePackages: [
		"@futureverse/react",
		"@futureverse/experience-sdk",
		"@futureverse/component-library",
	],

	experimental: {
		esmExternals: "loose",
	},

	webpack: (config) => {
		config.module.rules.push({
			test: /\.svg$/i,
			issuer: /\.[jt]sx?$/,
			use: [
				{
					loader: "@svgr/webpack",
					options: {
						exportType: "named",
					},
				},
			],
		});
		config.module.rules.push({
			test: /\.(woff|woff2|eot|ttf|otf)$/i,
			issuer: { and: [/\.(js|ts|md)x?$/] },
			type: "asset/resource",
		});

		return config;
	},

	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "xumm.app",
				port: "",
				pathname: "/sign/**",
			},
		],
	},
};

export default nextConfig;
