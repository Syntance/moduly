import type { FileType } from "@/lib/files/file-type";
import { extensionFromFilename, resolveFileType } from "@/lib/files/file-type";

export type { FileType } from "@/lib/files/file-type";
export { extensionFromFilename, resolveFileType } from "@/lib/files/file-type";

export type LineItemTextField = { label: string; value: string };

export type LineItemFile = {
	label: string;
	url: string;
	filename: string;
	extension: string;
	fileType: FileType;
};

export type LineItemLink = { label: string; url: string };

export type LineItemExtraRow =
	| ({ kind: "text" } & LineItemTextField)
	| ({ kind: "file" } & LineItemFile)
	| ({ kind: "link" } & LineItemLink);

function humanizeMetaKey(key: string): string {
	const cleaned = key.replace(/_/g, " ").trim();
	if (!cleaned) return "Pole";
	return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function filenameFromUrl(url: string): string {
	try {
		const pathname = new URL(url).pathname;
		const base = pathname.split("/").pop() ?? url;
		return decodeURIComponent(base);
	} catch {
		const parts = url.split("/");
		return parts[parts.length - 1] ?? url;
	}
}

function sortedNumericKeys(keys: string[], prefix: string): string[] {
	return keys
		.filter((k) => k.startsWith(prefix))
		.sort((a, b) => {
			const na = Number(a.slice(prefix.length));
			const nb = Number(b.slice(prefix.length));
			if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
			return a.localeCompare(b);
		});
}

export function parseLineItemTextFields(
	meta: Record<string, string> | undefined,
): LineItemTextField[] {
	if (!meta) return [];
	const rows: LineItemTextField[] = [];

	for (const [key, raw] of Object.entries(meta)) {
		const value = raw?.trim();
		if (!value || !key.startsWith("text_")) continue;
		if (key.endsWith("_label")) continue;
		const slug = key.slice("text_".length);
		const storedLabel = meta[`${key}_label`]?.trim();
		rows.push({
			label: storedLabel || humanizeMetaKey(slug),
			value,
		});
	}

	return rows;
}

export function parseLineItemFiles(meta: Record<string, string> | undefined): LineItemFile[] {
	if (!meta) return [];
	const rows: LineItemFile[] = [];

	for (const key of sortedNumericKeys(Object.keys(meta), "file_")) {
		const url = meta[key]?.trim();
		if (!url) continue;
		const index = key.slice("file_".length);
		const filename = filenameFromUrl(url);
		const extension = extensionFromFilename(filename);
		rows.push({
			label: `Plik ${index}`,
			url,
			filename,
			extension,
			fileType: resolveFileType(filename),
		});
	}

	return rows;
}

export function parseLineItemLinks(meta: Record<string, string> | undefined): LineItemLink[] {
	if (!meta) return [];
	const rows: LineItemLink[] = [];

	for (const key of sortedNumericKeys(Object.keys(meta), "link_")) {
		const url = meta[key]?.trim();
		if (!url) continue;
		const index = key.slice("link_".length);
		rows.push({
			label: `Link ${index}`,
			url,
		});
	}

	return rows;
}

/** Pola tekstowe, pliki i linki z metadata pozycji koszyka / zamówienia. */
export function parseLineItemExtraRows(
	meta: Record<string, string> | undefined,
): LineItemExtraRow[] {
	if (!meta) return [];
	return [
		...parseLineItemTextFields(meta).map((row) => ({ kind: "text" as const, ...row })),
		...parseLineItemFiles(meta).map((row) => ({ kind: "file" as const, ...row })),
		...parseLineItemLinks(meta).map((row) => ({ kind: "link" as const, ...row })),
	];
}

export function hasOrderLineItemColors(metadata: Record<string, string> | undefined): boolean {
	if (!metadata) return false;
	return (
		Boolean(metadata.custom_color?.trim()) ||
		Object.keys(metadata).some((k) => k.startsWith("color_") && metadata[k]?.trim()) ||
		metadata.certificate_stand === "true" ||
		metadata.certificate_stand === "1"
	);
}

export function hasOrderLineItemPersonalizationDetails(
	metadata: Record<string, string> | undefined,
): boolean {
	if (!metadata) return false;
	return (
		Object.keys(metadata).some(
			(k) => k.startsWith("text_") && !k.endsWith("_label") && metadata[k]?.trim(),
		) ||
		Object.keys(metadata).some((k) => k.startsWith("file_") && metadata[k]?.trim()) ||
		Object.keys(metadata).some((k) => k.startsWith("link_") && metadata[k]?.trim())
	);
}

export function hasOrderLineItemExtras(metadata: Record<string, string> | undefined): boolean {
	return hasOrderLineItemColors(metadata) || hasOrderLineItemPersonalizationDetails(metadata);
}
