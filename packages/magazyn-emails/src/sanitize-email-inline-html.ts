import sanitizeHtml from "sanitize-html";

const LEGACY_BOLD_RE = /\*\*([\s\S]*?)\*\*/g;

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
	allowedTags: ["strong", "b", "em", "i", "br", "span"],
	allowedAttributes: {
		span: ["style"],
	},
	allowedStyles: {
		span: {
			"font-weight": [/^(400|500|600|700)$/],
			"font-style": [/^(italic|normal)$/],
			"font-size": [/^(?:[8-9]|[1-4][0-9])px$/],
		},
	},
	disallowedTagsMode: "discard",
};

/** Czy treść wygląda na HTML z edytora (nie plain + **). */
export function containsEmailInlineHtml(raw: string): boolean {
	return /<[a-z][\s\S]*>/i.test(raw);
}

/** Normalizuje output contenteditable i sanityzuje do bezpiecznego HTML maila. */
export function sanitizeEmailInlineHtml(html: string): string {
	if (!html.trim()) return "";

	const normalized = html
		.replace(/<b\b([^>]*)>/gi, "<strong$1>")
		.replace(/<\/b>/gi, "</strong>")
		.replace(/<i\b([^>]*)>/gi, "<em$1>")
		.replace(/<\/i>/gi, "</em>")
		.replace(/<div><br><\/div>/gi, "<br>")
		.replace(/<div><\/div>/gi, "")
		.replace(/<div>/gi, "<br>")
		.replace(/<\/div>/gi, "")
		.replace(/<p><br><\/p>/gi, "<br>")
		.replace(/<p>/gi, "")
		.replace(/<\/p>/gi, "<br>")
		.replace(/(<br>\s*)+$/i, "");

	return sanitizeHtml(normalized, SANITIZE_OPTIONS).trim();
}

/** HTML do wyświetlenia w edytorze (plain, legacy ** lub zapisany HTML). */
export function toEditorDisplayHtml(raw: string): string {
	if (!raw.trim()) return "";

	if (containsEmailInlineHtml(raw)) return raw;

	let text = raw;
	if (text.includes("**")) {
		text = text.replace(LEGACY_BOLD_RE, "<strong>$1</strong>");
	}

	return text.replace(/\n/g, "<br>");
}

/** Plain text z HTML inline (do wersji tekstowej maila). */
export function emailInlineHtmlToPlain(html: string): string {
	return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
		.replace(/<br\s*\/?>/gi, "\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}
