import {
	containsEmailInlineHtml,
	emailInlineHtmlToPlain,
	sanitizeEmailInlineHtml,
} from "./sanitize-email-inline-html";

const MERGE_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
const BOLD_RE = /\*\*([\s\S]*?)\*\*/g; // legacy szablony

function esc(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function mergeSegmentHtml(segment: string, vars: Record<string, string>): string {
	return esc(segment).replace(MERGE_RE, (_m, token: string) => esc(vars[token] ?? ""));
}

function legacyBoldToHtml(raw: string): string {
	let result = "";
	let lastIndex = 0;

	for (const match of raw.matchAll(BOLD_RE)) {
		const index = match.index ?? 0;
		result += raw.slice(lastIndex, index);
		result += `<strong>${match[1] ?? ""}</strong>`;
		lastIndex = index + match[0].length;
	}

	result += raw.slice(lastIndex);
	return result;
}

/** HTML z podstawionymi {{token}} i inline formatowaniem. */
export function mergeRichHtml(raw: string, vars: Record<string, string>): string {
	if (!raw.trim()) return "";

	if (containsEmailInlineHtml(raw)) {
		const merged = raw.replace(MERGE_RE, (_m, token: string) => esc(vars[token] ?? ""));
		return sanitizeEmailInlineHtml(merged);
	}

	const withLegacy = raw.includes("**") ? legacyBoldToHtml(raw) : raw;
	if (containsEmailInlineHtml(withLegacy)) {
		const merged = withLegacy.replace(MERGE_RE, (_m, token: string) => esc(vars[token] ?? ""));
		return sanitizeEmailInlineHtml(merged);
	}

	return mergeSegmentHtml(withLegacy, vars);
}

/** Plain text — bez HTML / **, z podstawionymi zmieniami. */
export function mergeRichPlain(raw: string, vars: Record<string, string>): string {
	let text = raw;
	if (containsEmailInlineHtml(text)) {
		text = emailInlineHtmlToPlain(text);
	} else if (text.includes("**")) {
		text = text.replace(BOLD_RE, "$1");
	}
	return text.replace(MERGE_RE, (_m, token: string) => vars[token] ?? "");
}
