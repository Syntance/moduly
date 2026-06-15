import type { NextConfig } from "next";

const MEDUSA_BACKEND_URL =
	process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ??
	process.env.MEDUSA_BACKEND_URL ??
	"http://localhost:9000";

function collectMediaCdnOrigins(): string[] {
	const origins = new Set<string>();
	for (const raw of [process.env.S3_FILE_URL, process.env.NEXT_PUBLIC_S3_FILE_URL]) {
		if (!raw?.trim()) continue;
		try {
			origins.add(new URL(raw.trim()).origin);
		} catch {
			/* skip invalid */
		}
	}
	return [...origins];
}

const medusaUrl = new URL(MEDUSA_BACKEND_URL);
const mediaCdnOrigins = collectMediaCdnOrigins();
const r2RemotePatterns = mediaCdnOrigins.map((origin) => {
	const u = new URL(origin);
	return {
		protocol: u.protocol.replace(":", "") as "http" | "https",
		hostname: u.hostname,
		port: u.port || undefined,
		pathname: "/**",
	};
});

const MODULY_PACKAGES = [
	"@moduly/auth-core",
	"@moduly/cms",
	"@moduly/client-panel",
	"@moduly/commerce",
	"@moduly/config",
	"@moduly/data-store",
	"@moduly/magazyn-categories",
	"@moduly/magazyn-content",
	"@moduly/magazyn-core",
	"@moduly/magazyn-emails",
	"@moduly/magazyn-forms",
	"@moduly/magazyn-orders",
	"@moduly/magazyn-products",
	"@moduly/magazyn-returns",
	"@moduly/payments",
	"@moduly/seo-geo",
	"@moduly/types",
	"@moduly/ui",
] as const;

const nextConfig: NextConfig = {
	reactStrictMode: true,
	transpilePackages: [...MODULY_PACKAGES],
	images: {
		formats: ["image/avif", "image/webp"],
		remotePatterns: [
			{
				protocol: medusaUrl.protocol.replace(":", "") as "http" | "https",
				hostname: medusaUrl.hostname,
				port: medusaUrl.port || undefined,
				pathname: "/**",
			},
			...r2RemotePatterns,
			{
				protocol: "https",
				hostname: "**.r2.dev",
				pathname: "/**",
			},
			{
				protocol: "https",
				hostname: "**.r2.cloudflarestorage.com",
				pathname: "/**",
			},
			{
				protocol: "https",
				hostname: "**.amazonaws.com",
				pathname: "/**",
			},
		],
	},
};

export default nextConfig;
