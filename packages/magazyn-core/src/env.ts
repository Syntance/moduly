import "server-only";

import { z } from "zod";

const optionalTrimmedString = z
	.string()
	.optional()
	.transform((value) => {
		const trimmed = value?.trim();
		return trimmed || undefined;
	});

const optionalUrlString = z
	.string()
	.optional()
	.transform((value) => {
		const trimmed = value?.trim();
		if (!trimmed) return undefined;
		const parsed = z.string().url().safeParse(trimmed);
		if (!parsed.success) return undefined;
		return trimmed.replace(/\/$/, "");
	});

const serverEnvSchema = z.object({
	MEDUSA_BACKEND_URL: optionalTrimmedString,
	NEXT_PUBLIC_MEDUSA_BACKEND_URL: optionalTrimmedString,
	MEDUSA_ADMIN_EMAIL: optionalTrimmedString,
	MEDUSA_ADMIN_PASSWORD: optionalTrimmedString,
	MAGAZYN_ADMIN_ALLOWLIST: optionalTrimmedString,
	UPSTASH_REDIS_REST_URL: optionalUrlString,
	UPSTASH_REDIS_REST_TOKEN: optionalTrimmedString,
	S3_ENDPOINT: optionalTrimmedString,
	S3_ACCESS_KEY_ID: optionalTrimmedString,
	S3_SECRET_ACCESS_KEY: optionalTrimmedString,
	S3_BUCKET: optionalTrimmedString,
	S3_FILE_URL: optionalUrlString,
	S3_REGION: optionalTrimmedString,
	NEXT_PUBLIC_S3_FILE_URL: optionalUrlString,
	MEDUSA_REVALIDATE_SECRET: optionalTrimmedString,
	STOREFRONT_REVALIDATE_URL: optionalUrlString,
	VERCEL_DEPLOY_HOOK_URL: optionalUrlString,
	NEXT_PUBLIC_SITE_URL: optionalUrlString,
	RESEND_API_KEY: optionalTrimmedString,
	RESEND_FROM_EMAIL: optionalTrimmedString,
	RESEND_REPLY_TO: optionalTrimmedString,
	RESEND_CONTACT_TO: optionalTrimmedString,
});

type ParsedServerEnv = z.infer<typeof serverEnvSchema>;

let cachedEnv: ParsedServerEnv | null = null;

function getParsedEnv(): ParsedServerEnv {
	if (!cachedEnv) {
		const result = serverEnvSchema.safeParse(process.env);
		if (!result.success) {
			throw new Error(`Nieprawidłowa konfiguracja ENV: ${result.error.message}`);
		}
		cachedEnv = result.data;
	}
	return cachedEnv;
}

export type R2Config = {
	endpoint: string;
	accessKeyId: string;
	secretAccessKey: string;
	bucket: string;
	fileUrl: string;
	region: string;
};

function resolveMedusaBackendUrl(env: ParsedServerEnv): string {
	const url = env.MEDUSA_BACKEND_URL ?? env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
	if (!url) {
		throw new Error(
			"Brak MEDUSA_BACKEND_URL / NEXT_PUBLIC_MEDUSA_BACKEND_URL w środowisku (patrz .env.example).",
		);
	}
	return url.replace(/\/$/, "");
}

function parseAllowlist(raw: string | undefined): string[] {
	if (!raw) return [];
	return raw
		.split(",")
		.map((entry) => entry.trim().toLowerCase())
		.filter(Boolean);
}

function getR2Config(env: ParsedServerEnv): R2Config | null {
	const endpoint = env.S3_ENDPOINT;
	const accessKeyId = env.S3_ACCESS_KEY_ID;
	const secretAccessKey = env.S3_SECRET_ACCESS_KEY;
	const bucket = env.S3_BUCKET;
	const fileUrl = env.S3_FILE_URL;

	if (!endpoint || !accessKeyId || !secretAccessKey || !bucket || !fileUrl) {
		return null;
	}

	return {
		endpoint,
		accessKeyId,
		secretAccessKey,
		bucket,
		fileUrl,
		region: env.S3_REGION ?? "auto",
	};
}

/** Dostęp do zmiennych środowiskowych po stronie serwera z walidacją Zod. */
export const serverEnv = {
	get medusaBackendUrl(): string {
		return resolveMedusaBackendUrl(getParsedEnv());
	},
	get adminEmail(): string | undefined {
		return getParsedEnv().MEDUSA_ADMIN_EMAIL;
	},
	get adminPassword(): string | undefined {
		return getParsedEnv().MEDUSA_ADMIN_PASSWORD;
	},
	get adminAllowlist(): string[] {
		return parseAllowlist(getParsedEnv().MAGAZYN_ADMIN_ALLOWLIST);
	},
	get upstashRedisRestUrl(): string | undefined {
		return getParsedEnv().UPSTASH_REDIS_REST_URL;
	},
	get upstashRedisRestToken(): string | undefined {
		return getParsedEnv().UPSTASH_REDIS_REST_TOKEN;
	},
	get r2Config(): R2Config | null {
		return getR2Config(getParsedEnv());
	},
	get s3FileUrl(): string | undefined {
		return getParsedEnv().S3_FILE_URL ?? getParsedEnv().NEXT_PUBLIC_S3_FILE_URL;
	},
	get medusaRevalidateSecret(): string | undefined {
		return getParsedEnv().MEDUSA_REVALIDATE_SECRET;
	},
	get storefrontRevalidateUrl(): string | undefined {
		return getParsedEnv().STOREFRONT_REVALIDATE_URL;
	},
	get vercelDeployHookUrl(): string | undefined {
		return getParsedEnv().VERCEL_DEPLOY_HOOK_URL;
	},
	get siteUrl(): string {
		return (getParsedEnv().NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
	},
	get resendApiKey(): string | undefined {
		return getParsedEnv().RESEND_API_KEY;
	},
	get resendFromEmail(): string | undefined {
		return getParsedEnv().RESEND_FROM_EMAIL;
	},
	get resendReplyTo(): string | undefined {
		return getParsedEnv().RESEND_REPLY_TO;
	},
	get resendContactTo(): string | undefined {
		return getParsedEnv().RESEND_CONTACT_TO;
	},
};

/** Lista dozwolonych e-maili administratorów panelu (CSV w `MAGAZYN_ADMIN_ALLOWLIST`). */
export function getAdminAllowlist(): string[] {
	return serverEnv.adminAllowlist;
}

/** Pusta allowlista = brak ograniczenia (zachowanie wsteczne). */
export function isAdminEmailAllowed(email: string | null | undefined): boolean {
	const allow = getAdminAllowlist();
	if (allow.length === 0) return true;
	if (!email) return false;
	return allow.includes(email.trim().toLowerCase());
}
