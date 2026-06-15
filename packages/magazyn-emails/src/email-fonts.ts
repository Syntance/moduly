/**
 * Czcionki marki Lumine (Gilroy, Chronicle, Binerka) + web-safe fallbacki.
 * W mailach: @font-face z publicznego /fonts/ + stack z Georgia/system-ui.
 */

import type { EmailFontKey } from "@moduly/config";

export type FontKey = EmailFontKey;

export const FONT_KEYS = [
	"gilroy",
	"chronicle",
	"binerka",
	"serif",
	"sans",
	"mono",
] as const satisfies readonly EmailFontKey[];

export type BrandFontKey = "gilroy" | "chronicle" | "binerka";

export const FONT_STACKS: Record<FontKey, string> = {
	gilroy: "'Gilroy', system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif",
	chronicle: "'Chronicle Display', Georgia, 'Times New Roman', Times, serif",
	binerka: "'Binerka', 'Chronicle Display', Georgia, 'Times New Roman', serif",
	serif: "Georgia, 'Times New Roman', Times, serif",
	sans: "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
	mono: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
};

export const FONT_OPTIONS: Array<{ value: FontKey; label: string }> = [
	{ value: "gilroy", label: "Gilroy (tekst — jak sklep)" },
	{ value: "chronicle", label: "Chronicle Display (nagłówki)" },
	{ value: "binerka", label: "Binerka (dekoracyjna)" },
	{ value: "serif", label: "Szeryfowy (Georgia)" },
	{ value: "sans", label: "Bezszeryfowy (system)" },
	{ value: "mono", label: "Monospace" },
];

type FontFaceFile = {
	path: string;
	weight: number;
	format: "truetype" | "opentype";
};

const BRAND_FONT_FACES: Record<BrandFontKey, { family: string; files: FontFaceFile[] }> = {
	gilroy: {
		family: "Gilroy",
		files: [
			{ path: "/fonts/Gilroy-Regular.ttf", weight: 400, format: "truetype" },
			{ path: "/fonts/Gilroy-Medium.ttf", weight: 500, format: "truetype" },
			{ path: "/fonts/Gilroy-SemiBold.ttf", weight: 600, format: "truetype" },
			{ path: "/fonts/Gilroy-Bold.ttf", weight: 700, format: "truetype" },
		],
	},
	chronicle: {
		family: "Chronicle Display",
		files: [
			{ path: "/fonts/ChronicleDisp-Roman.otf", weight: 400, format: "opentype" },
			{ path: "/fonts/ChronicleDisp-Bold.otf", weight: 700, format: "opentype" },
		],
	},
	binerka: {
		family: "Binerka",
		files: [{ path: "/fonts/Binerka.otf", weight: 400, format: "opentype" }],
	},
};

export function isBrandFontKey(key: FontKey): key is BrandFontKey {
	return key === "gilroy" || key === "chronicle" || key === "binerka";
}

/** CSS @font-face dla wybranej czcionki marki (pusty string dla web-safe). */
export function emailFontFaceCss(fontKey: FontKey, assetsBaseUrl: string): string {
	if (!isBrandFontKey(fontKey)) return "";
	const base = assetsBaseUrl.replace(/\/$/, "");
	const spec = BRAND_FONT_FACES[fontKey];
	return spec.files
		.map(
			(file) =>
				`@font-face{font-family:'${spec.family}';src:url('${base}${file.path}') format('${file.format}');font-weight:${file.weight};font-style:normal;font-display:swap;}`,
		)
		.join("");
}
