export type FileType =
	| "pdf"
	| "image"
	| "vector"
	| "document"
	| "spreadsheet"
	| "presentation"
	| "archive"
	| "video"
	| "audio"
	| "design"
	| "font"
	| "code"
	| "unknown";

export function extensionFromFilename(filename: string): string {
	const dot = filename.lastIndexOf(".");
	if (dot <= 0) return "";
	return filename.slice(dot + 1).toLowerCase();
}

const EXTENSION_MAP: Record<string, FileType> = {
	pdf: "pdf",
	jpg: "image",
	jpeg: "image",
	png: "image",
	webp: "image",
	gif: "image",
	bmp: "image",
	tiff: "image",
	tif: "image",
	heic: "image",
	heif: "image",
	avif: "image",
	svg: "vector",
	eps: "vector",
	ai: "vector",
	doc: "document",
	docx: "document",
	odt: "document",
	rtf: "document",
	txt: "document",
	md: "document",
	xls: "spreadsheet",
	xlsx: "spreadsheet",
	csv: "spreadsheet",
	ods: "spreadsheet",
	ppt: "presentation",
	pptx: "presentation",
	odp: "presentation",
	key: "presentation",
	zip: "archive",
	rar: "archive",
	"7z": "archive",
	tar: "archive",
	gz: "archive",
	mp4: "video",
	mov: "video",
	avi: "video",
	webm: "video",
	mkv: "video",
	m4v: "video",
	mp3: "audio",
	wav: "audio",
	flac: "audio",
	aac: "audio",
	ogg: "audio",
	m4a: "audio",
	psd: "design",
	fig: "design",
	sketch: "design",
	xd: "design",
	indd: "design",
	ttf: "font",
	otf: "font",
	woff: "font",
	woff2: "font",
	js: "code",
	ts: "code",
	jsx: "code",
	tsx: "code",
	json: "code",
	html: "code",
	css: "code",
	py: "code",
};

/** Rozpoznaje typ pliku po nazwie lub samym rozszerzeniu. */
export function resolveFileType(filenameOrExtension: string): FileType {
	const ext = filenameOrExtension.includes(".")
		? extensionFromFilename(filenameOrExtension)
		: filenameOrExtension.toLowerCase().replace(/^\./, "");
	if (!ext) return "unknown";
	return EXTENSION_MAP[ext] ?? "unknown";
}

/** @deprecated Użyj `resolveFileType` — zachowane dla starszych importów. */
export function classifyUploadedFile(filename: string): FileType {
	return resolveFileType(filename);
}
