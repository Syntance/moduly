import {
	CMS_IMAGE_WEBP_QUALITY,
	VERCEL_SAFE_UPLOAD_BYTES,
} from "./cms-image-config";

/** Margines pod limit body Vercel (~4.5 MB). */
const UPLOAD_TARGET_BYTES = VERCEL_SAFE_UPLOAD_BYTES - 256 * 1024;

const HEIC_TYPES = new Set(["image/heic", "image/heif", "image/heic-sequence"]);

const SKIP_WEBP_CONVERSION = new Set(["image/gif", "image/svg+xml", "image/webp"]);

export function canCompressCmsImage(file: File): boolean {
	const type = file.type.toLowerCase();
	if (HEIC_TYPES.has(type)) return false;
	const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
	if (ext === "heic" || ext === "heif") return false;
	return type.startsWith("image/") || /\.(jpe?g|png|webp|gif|avif)$/i.test(file.name);
}

function loadImageFromFileLegacy(file: File): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const url = URL.createObjectURL(file);
		const img = new Image();
		img.onload = () => {
			URL.revokeObjectURL(url);
			resolve(img);
		};
		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error("Nie udało się odczytać obrazu."));
		};
		img.src = url;
	});
}

type RasterSource = {
	source: CanvasImageSource;
	width: number;
	height: number;
	close?: () => void;
};

/** JPEG z telefonu — EXIF orientacja (createImageBitmap) przed canvas. */
async function loadRasterFromFile(file: File): Promise<RasterSource> {
	if (typeof createImageBitmap !== "undefined") {
		try {
			const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
			return {
				source: bitmap,
				width: bitmap.width,
				height: bitmap.height,
				close: () => bitmap.close(),
			};
		} catch {
			/* fallback */
		}
	}

	const img = await loadImageFromFileLegacy(file);
	return {
		source: img,
		width: img.naturalWidth,
		height: img.naturalHeight,
	};
}

function canvasToWebpBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
	return new Promise((resolve) => {
		canvas.toBlob(resolve, "image/webp", quality);
	});
}

function drawScaled(
	source: CanvasImageSource,
	naturalWidth: number,
	naturalHeight: number,
	maxDim: number,
): HTMLCanvasElement {
	let width = naturalWidth;
	let height = naturalHeight;
	if (Number.isFinite(maxDim) && (width > maxDim || height > maxDim)) {
		const scale = maxDim / Math.max(width, height);
		width = Math.max(1, Math.round(width * scale));
		height = Math.max(1, Math.round(height * scale));
	}

	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("CANVAS_UNAVAILABLE");
	ctx.drawImage(source, 0, 0, width, height);
	return canvas;
}

function webpFilename(originalName: string): string {
	const baseName = originalName.replace(/\.[^.]+$/, "") || "cms";
	return `${baseName}.webp`;
}

async function encodeWebpAtDim(
	source: CanvasImageSource,
	naturalWidth: number,
	naturalHeight: number,
	maxDim: number,
	quality: number,
): Promise<File | null> {
	const canvas = drawScaled(source, naturalWidth, naturalHeight, maxDim);
	const blob = await canvasToWebpBlob(canvas, quality);
	if (!blob) return null;
	return new File([blob], "cms-upload.webp", { type: "image/webp" });
}

async function encodeUnderLimit(
	source: CanvasImageSource,
	naturalWidth: number,
	naturalHeight: number,
	maxDim: number,
): Promise<File | null> {
	const qualities = [0.92, 0.86, 0.8, 0.74, 0.68] as const;

	for (const quality of qualities) {
		const encoded = await encodeWebpAtDim(source, naturalWidth, naturalHeight, maxDim, quality);
		if (encoded && encoded.size <= UPLOAD_TARGET_BYTES) {
			return encoded;
		}
	}
	return null;
}

/** PNG/JPG/AVIF → WebP w pełnej rozdzielczości. GIF/SVG/WebP bez zmian. */
export async function convertCmsImageToWebp(file: File): Promise<File> {
	const type = file.type.toLowerCase();
	const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
	if (SKIP_WEBP_CONVERSION.has(type) || ext === "webp" || ext === "gif" || ext === "svg") {
		return file;
	}
	if (!canCompressCmsImage(file)) return file;

	const raster = await loadRasterFromFile(file);
	try {
		const encoded = await encodeWebpAtDim(
			raster.source,
			raster.width,
			raster.height,
			Number.POSITIVE_INFINITY,
			CMS_IMAGE_WEBP_QUALITY / 100,
		);
		if (!encoded) {
			throw new Error("Nie udało się przekonwertować obrazu do WebP.");
		}
		return new File([encoded], webpFilename(file.name), { type: "image/webp" });
	} finally {
		raster.close?.();
	}
}

/** Przed uploadem: raster → WebP; zbyt duże pliki skalują się do limitu Vercel. */
export async function prepareCmsImageForUpload(file: File): Promise<File> {
	const webp = await convertCmsImageToWebp(file);
	if (webp.size <= UPLOAD_TARGET_BYTES) return webp;
	return compressCmsImageForUpload(webp);
}

/** Kompresuje obraz CMS do WebP ≤ ~3.75 MB — mieści się w limicie Server Actions na Vercel. */
export async function compressCmsImageForUpload(file: File): Promise<File> {
	if (file.size <= UPLOAD_TARGET_BYTES) return file;

	const raster = await loadRasterFromFile(file);
	try {
		for (const maxDim of [3840, 3200, 2560, 1920, 1600]) {
			const encoded = await encodeUnderLimit(raster.source, raster.width, raster.height, maxDim);
			if (encoded) {
				return new File([encoded], webpFilename(file.name), { type: "image/webp" });
			}
		}
	} finally {
		raster.close?.();
	}

	throw new Error(
		"Nie udało się zmniejszyć pliku do limitu uploadu. Użyj JPG/WebP o mniejszej rozdzielczości.",
	);
}
