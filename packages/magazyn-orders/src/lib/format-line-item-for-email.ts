import { parseLineItemExtraRows, type LineItemExtraRow } from "./line-item-extras";

const COLOR_ELEMENT_LABELS: Record<string, string> = {
	kolor: "Kolor",
	tabliczki: "Tabliczka",
	podstawki: "Podstawka",
	"3d": "Elementy 3D",
	elementów_3d: "Elementy 3D",
	elementow_3d: "Elementy 3D",
};

function humanizeSlug(slug: string): string {
	return slug.replace(/_/g, " ");
}

function certificateStandLine(meta: Record<string, string>): string | null {
	const v = meta.certificate_stand?.trim();
	if (v !== "true" && v !== "1") return null;
	const color = meta.color_podstawki?.trim() || meta.color_podstawki_custom?.trim();
	if (color) return `+ Podstawka: ${color}`;
	return "+ Podstawka";
}

function formatColorLine(label: string, value: string, mat?: string): string {
	const suffix = mat === "true" ? " (mat)" : "";
	return `${label}: ${value}${suffix}`;
}

function colorDetailLines(meta: Record<string, string>): string[] {
	const lines: string[] = [];

	if (meta.custom_color?.trim()) {
		lines.push(formatColorLine("Kolor", meta.custom_color.trim()));
	}

	const paletteKeys = Object.keys(meta).filter(
		(k) =>
			k.startsWith("color_") &&
			!k.endsWith("_custom") &&
			!k.endsWith("_mat") &&
			!k.endsWith("_hex") &&
			meta[k]?.trim(),
	);

	const customBases = new Set(
		Object.keys(meta)
			.filter((k) => k.startsWith("color_") && k.endsWith("_custom"))
			.map((k) => k.replace(/_custom$/, "")),
	);

	for (const k of [...paletteKeys].sort()) {
		if (customBases.has(k)) continue;
		const slug = k.slice("color_".length);
		const label = COLOR_ELEMENT_LABELS[slug] ?? humanizeSlug(slug);
		const value = meta[k]?.trim() ?? "";
		const hex = meta[`${k}_hex`]?.trim();
		const display = hex ? `${value} (${hex})` : value;
		lines.push(formatColorLine(label, display, meta[`${k}_mat`]));
	}

	for (const [k, raw] of Object.entries(meta)) {
		if (!k.startsWith("color_") || !k.endsWith("_custom") || !raw?.trim()) continue;
		const base = k.replace(/_custom$/, "");
		const slug = base.slice("color_".length);
		const label = COLOR_ELEMENT_LABELS[slug] ?? "Kolor niestandardowy";
		lines.push(formatColorLine(label, raw.trim(), meta[`${base}_mat`]));
	}

	return lines;
}

function extraRowLine(row: LineItemExtraRow): string {
	if (row.kind === "text") {
		return `${row.label}: „${row.value}"`;
	}
	if (row.kind === "file") {
		return `${row.label}: ${row.filename} (${row.url})`;
	}
	return `${row.label}: ${row.url}`;
}

/**
 * Linie szczegółów pozycji (kolory/mat, pola tekstowe, pliki, linki) — do mailów HTML i plain.
 */
export function formatLineItemDetailsLines(meta: Record<string, string> | undefined): string[] {
	if (!meta) return [];

	const lines: string[] = [];
	lines.push(...colorDetailLines(meta));

	const stand = certificateStandLine(meta);
	if (stand) lines.push(stand);

	for (const row of parseLineItemExtraRows(meta)) {
		lines.push(extraRowLine(row));
	}

	return lines;
}

export function formatLineItemDetailsPlain(meta: Record<string, string> | undefined): string {
	return formatLineItemDetailsLines(meta).join("\n");
}
