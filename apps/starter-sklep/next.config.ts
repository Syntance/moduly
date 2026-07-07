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

/**
 * CSP checkoutu — domeny bramek płatniczych muszą być na allowliście, inaczej
 * redirecty / iframe / fetch P24, tpay, Stripe i Turnstile padną w produkcji.
 *
 * UWAGA (hardening): docelowo `script-src` powinien używać nonce +
 * `strict-dynamic` z Routing Middleware (per-request nonce — patrz
 * 46-checkout-standards.mdc §5). Tu starter używa `'unsafe-inline'` jako
 * pragmatyczny default, by nie blokować inline analytics przy starcie projektu.
 * `style-src` świadomie dopuszcza `'unsafe-inline'` (GSAP/Framer wstrzykują style).
 */
const PAYMENT_FRAME_SRC = [
	"https://*.przelewy24.pl",
	"https://*.tpay.com",
	"https://js.stripe.com",
	"https://hooks.stripe.com",
	"https://challenges.cloudflare.com",
];
const PAYMENT_CONNECT_SRC = [
	"https://*.przelewy24.pl",
	"https://*.tpay.com",
	"https://api.stripe.com",
	"https://challenges.cloudflare.com",
];

const CSP = [
	"default-src 'self'",
	"base-uri 'self'",
	"object-src 'none'",
	"frame-ancestors 'none'",
	"form-action 'self' https://*.przelewy24.pl https://*.tpay.com",
	"img-src 'self' data: blob: https:",
	"font-src 'self' data:",
	"style-src 'self' 'unsafe-inline'",
	`script-src 'self' 'unsafe-inline' https://js.stripe.com https://challenges.cloudflare.com`,
	`frame-src 'self' ${PAYMENT_FRAME_SRC.join(" ")}`,
	`connect-src 'self' ${PAYMENT_CONNECT_SRC.join(" ")}`,
]
	.join("; ")
	.concat(";");

const nextConfig: NextConfig = {
	reactStrictMode: true,
	transpilePackages: [...MODULY_PACKAGES],
	async headers() {
		return [
			{
				source: "/:path*",
				headers: [
					{ key: "Content-Security-Policy", value: CSP },
					{ key: "X-Content-Type-Options", value: "nosniff" },
					{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
				],
			},
		];
	},
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
