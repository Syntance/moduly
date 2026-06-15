import type { ContentPageId, SeoMeta, SiteSettings } from "@moduly/types";

export type LlmsTxtPage = {
	id: ContentPageId;
	label: string;
	path: string;
	seo?: SeoMeta;
};

export type GenerateLlmsTxtOptions = {
	siteUrl: string;
	siteSettings: SiteSettings;
	pages: LlmsTxtPage[];
	extraSections?: string[];
};

/**
 * Generuje plik llms.txt — mapa witryny dla crawlerów AI/LLM.
 * @see https://llmstxt.org/
 */
export function generateLlmsTxt({
	siteUrl,
	siteSettings,
	pages,
	extraSections = [],
}: GenerateLlmsTxtOptions): string {
	const origin = siteUrl.trim().replace(/\/$/, "");
	const lines: string[] = [
		`# ${siteSettings.title}`,
		"",
		"> " + siteSettings.description.trim(),
		"",
		"## Strony",
		"",
	];

	for (const page of pages) {
		const title = page.seo?.metaTitle?.trim() || page.label;
		const description = page.seo?.metaDescription?.trim();
		lines.push(`- [${title}](${origin}${page.path})`);
		if (description) {
			lines.push(`  - ${description}`);
		}
	}

	if (extraSections.length > 0) {
		lines.push("", ...extraSections);
	}

	lines.push(
		"",
		"## Opcjonalne",
		"",
		`- [Sitemap](${origin}/sitemap.xml)`,
		`- [Robots](${origin}/robots.txt)`,
		"",
	);

	return lines.join("\n");
}
