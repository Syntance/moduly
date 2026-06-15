const POLISH_MAP: Record<string, string> = {
	ą: "a",
	ć: "c",
	ę: "e",
	ł: "l",
	ń: "n",
	ó: "o",
	ś: "s",
	ź: "z",
	ż: "z",
};

/** Slug URL-safe z polskich znaków — handle w Medusa wymaga [a-z0-9-]. */
export function slugify(input: string): string {
	const base = input
		.toLowerCase()
		.trim()
		.replace(/[ąćęłńóśźż]/g, (char) => POLISH_MAP[char] ?? char)
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 80)
		.replace(/-+$/g, "");

	return base || `item-${Date.now()}`;
}
