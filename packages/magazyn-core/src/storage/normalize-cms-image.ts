import sharp from "sharp";
import {
	CMS_IMAGE_MAX_LONG_EDGE,
	CMS_IMAGE_WEBP_QUALITY,
} from "./cms-image-config";

const SKIP_WEBP_CONVERSION = new Set(["image/gif", "image/svg+xml", "image/webp"]);

function inferMimeFromName(name: string): string | null {
	const ext = name.split(".").pop()?.toLowerCase() ?? "";
	if (ext === "gif") return "image/gif";
	if (ext === "svg") return "image/svg+xml";
	if (ext === "webp") return "image/webp";
	if (ext === "png") return "image/png";
	if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
	if (ext === "avif") return "image/avif";
	return null;
}

/** Konwersja CMS → WebP (EXIF rotate, max bok, q92). GIF/SVG/WebP bez zmian. */
export async function normalizeCmsImageToWebp(
	input: Buffer,
	maxLongEdge = CMS_IMAGE_MAX_LONG_EDGE,
	sourceMime?: string | null,
): Promise<Buffer> {
	if (sourceMime && SKIP_WEBP_CONVERSION.has(sourceMime)) {
		return input;
	}

	let pipeline = sharp(input).rotate();
	if (maxLongEdge > 0) {
		pipeline = pipeline.resize(maxLongEdge, maxLongEdge, {
			fit: "inside",
			withoutEnlargement: true,
		});
	}

	return pipeline
		.webp({
			quality: CMS_IMAGE_WEBP_QUALITY,
			effort: 4,
			smartSubsample: true,
		})
		.toBuffer();
}

export function cmsUploadFileName(originalName: string): string {
	const stem =
		originalName
			.replace(/\.[^.]+$/, "")
			.replace(/[^\w.-]+/g, "-")
			.replace(/^-+|-+$/g, "") || "cms-image";
	return `${stem}.webp`;
}

function isSvgFile(file: File): boolean {
	return file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");
}

/** Przygotowuje plik z panelu CMS do uploadu (raster → WebP; GIF/WebP bez zmian). */
export async function prepareCmsUploadFile(file: File): Promise<File> {
	if (isSvgFile(file)) {
		throw new Error("SVG nie jest obsługiwany — użyj JPG, PNG lub WebP.");
	}

	const mime = file.type || inferMimeFromName(file.name);
	if (mime && SKIP_WEBP_CONVERSION.has(mime)) {
		return file;
	}

	const optimized = await normalizeCmsImageToWebp(
		Buffer.from(await file.arrayBuffer()),
		CMS_IMAGE_MAX_LONG_EDGE,
		mime,
	);
	return new File([new Uint8Array(optimized)], cmsUploadFileName(file.name), {
		type: "image/webp",
	});
}
