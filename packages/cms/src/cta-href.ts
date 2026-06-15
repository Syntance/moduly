/** Usuwa zdublowane fragmenty URL (#formularz#formularz → #formularz). */
export function normalizeHeroCtaHref(href: string): string {
	const trimmed = href.trim();
	if (!trimmed.includes("#")) return trimmed;

	const segments = trimmed.split("#");
	const base = segments[0];
	const fragment = segments.find((s, i) => i > 0 && s.length > 0);
	if (!fragment) return trimmed;

	return base ? `${base}#${fragment}` : `#${fragment}`;
}
