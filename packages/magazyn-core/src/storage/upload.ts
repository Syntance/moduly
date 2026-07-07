import "server-only";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { serverEnv, type R2Config } from "../env";
import { serviceAdminUpload } from "../medusa/client";
import { resolveMedusaMediaUrl } from "../medusa/media-url";
import { prepareCmsUploadFile } from "./normalize-cms-image";
import { MAX_CMS_UPLOAD_BYTES } from "./cms-image-config";

const CMS_UPLOAD_PREFIX = "cms-uploads";

const CMS_IMAGE_TYPES = new Set([
	"image/png",
	"image/jpeg",
	"image/webp",
	"image/gif",
	"image/avif",
]);

const EXT_TO_MIME: Record<string, string> = {
	png: "image/png",
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	webp: "image/webp",
	gif: "image/gif",
	avif: "image/avif",
};

export type CmsUploadResult = {
	url: string;
	filename: string;
	size: number;
};

const R2_UPLOAD_TIMEOUT_MS = 15_000;
const LARGE_R2_UPLOAD_TIMEOUT_MS = 120_000;

let cachedR2: S3Client | null = null;

function inferCmsMimeType(file: File): string | null {
	if (file.type && CMS_IMAGE_TYPES.has(file.type)) return file.type;
	const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
	const fromExt = EXT_TO_MIME[ext];
	return fromExt && CMS_IMAGE_TYPES.has(fromExt) ? fromExt : null;
}

export function validateCmsUploadFile(file: File): string | null {
	if (file.size > MAX_CMS_UPLOAD_BYTES) {
		return `Plik jest za duży (maks. ${Math.floor(MAX_CMS_UPLOAD_BYTES / (1024 * 1024))} MB).`;
	}
	if (!inferCmsMimeType(file)) {
		return "Dozwolone formaty: JPG, PNG, WEBP, GIF, AVIF.";
	}
	return null;
}

async function withUploadTimeout<T>(
	promise: Promise<T>,
	label: string,
	timeoutMs = R2_UPLOAD_TIMEOUT_MS,
): Promise<T> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		return await Promise.race([
			promise,
			new Promise<never>((_, reject) => {
				timer = setTimeout(() => { reject(new Error(`${label}_TIMEOUT`)); }, timeoutMs);
			}),
		]);
	} finally {
		if (timer) clearTimeout(timer);
	}
}

function resolveMedusaFileUrl(url: string): string {
	if (/^https?:\/\//i.test(url) || url.startsWith("data:")) return url;
	const resolved = resolveMedusaMediaUrl(url);
	return resolved ?? url;
}

async function uploadViaR2(
	file: File,
	config: R2Config,
	keyPrefix: string,
	timeoutMs = R2_UPLOAD_TIMEOUT_MS,
): Promise<CmsUploadResult> {
	if (!cachedR2) {
		cachedR2 = new S3Client({
			region: config.region,
			endpoint: config.endpoint,
			forcePathStyle: true,
			credentials: {
				accessKeyId: config.accessKeyId,
				secretAccessKey: config.secretAccessKey,
			},
		});
	}

	const timestamp = Date.now();
	const random = Math.random().toString(36).slice(2, 8);
	const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
	const prefix = keyPrefix.endsWith("/") ? keyPrefix : `${keyPrefix}/`;
	const key = `${prefix}${timestamp}-${random}-${safeName}`;

	const bytes = new Uint8Array(await file.arrayBuffer());
	const mime = inferCmsMimeType(file);

	await withUploadTimeout(
		cachedR2.send(
			new PutObjectCommand({
				Bucket: config.bucket,
				Key: key,
				Body: bytes,
				ContentType: mime ?? "application/octet-stream",
			}),
		),
		"R2_UPLOAD",
		timeoutMs,
	);

	const base = config.fileUrl.replace(/\/$/, "");
	return { url: `${base}/${key}`, filename: file.name, size: file.size };
}

async function uploadViaMedusa(file: File): Promise<CmsUploadResult> {
	const urls = await serviceAdminUpload([file]);
	const url = urls[0];
	if (!url) throw new Error("MEDUSA_UPLOAD_EMPTY");

	return {
		url: resolveMedusaFileUrl(url),
		filename: file.name,
		size: file.size,
	};
}

/** Assety CMS (hero, galeria, OG) — normalizacja WebP, R2 z timeoutem; fallback Medusa. */
export async function uploadCmsAssetFile(file: File): Promise<CmsUploadResult> {
	const validationError = validateCmsUploadFile(file);
	if (validationError) throw new Error(validationError);

	const prepared = await prepareCmsUploadFile(file);

	const r2 = serverEnv.r2Config;
	if (r2) {
		try {
			return await uploadViaR2(prepared, r2, CMS_UPLOAD_PREFIX, LARGE_R2_UPLOAD_TIMEOUT_MS);
		} catch (error) {
			try {
				return await uploadViaMedusa(prepared);
			} catch {
				if (error instanceof Error && error.message === "R2_UPLOAD_TIMEOUT") {
					throw new Error(
						"Upload do R2 trwa zbyt długo. Sprawdź połączenie lub spróbuj mniejszego pliku (WebP/JPG).",
					);
				}
				throw error instanceof Error ? error : new Error("R2_UPLOAD_FAILED");
			}
		}
	}

	return uploadViaMedusa(prepared);
}
