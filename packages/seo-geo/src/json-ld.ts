import type { FaqItem, SocialLinks } from "@moduly/types";

export type OrganizationJsonLdInput = {
	siteUrl: string;
	name: string;
	description?: string;
	logoUrl?: string;
	sameAs?: string[];
};

export type LocalBusinessJsonLdInput = {
	siteUrl: string;
	name: string;
	pagePath?: string;
	email?: string;
	telephone?: string;
	imageUrl?: string;
	address?: {
		streetAddress: string;
		addressLocality: string;
		postalCode: string;
		addressCountry: string;
	};
	openingHours?: Array<{
		dayOfWeek: string[];
		opens: string;
		closes: string;
	}>;
	sameAs?: string[];
};

export type ProductJsonLdInput = {
	siteUrl: string;
	path: string;
	name: string;
	description?: string;
	images: string[];
	sku: string;
	brandName: string;
	lowPrice: number;
	highPrice: number;
	offerCount?: number;
	currency?: string;
	inStock: boolean;
};

export type BreadcrumbItem = {
	label: string;
	href?: string;
};

export function resolveSocialSameAs(social: SocialLinks): string[] {
	const urls = [social.instagram, social.facebook, social.tiktok]
		.map((url) => url?.trim())
		.filter((url): url is string => Boolean(url));
	return [...new Set(urls)];
}

export function organizationJsonLd(input: OrganizationJsonLdInput): Record<string, unknown> {
	const origin = input.siteUrl.trim().replace(/\/$/, "");
	return {
		"@context": "https://schema.org",
		"@type": "Organization",
		name: input.name,
		url: origin,
		...(input.description ? { description: input.description } : {}),
		...(input.logoUrl ? { logo: input.logoUrl } : {}),
		...(input.sameAs?.length ? { sameAs: input.sameAs } : {}),
	};
}

export function websiteJsonLd(input: {
	siteUrl: string;
	name: string;
	searchPath?: string;
}): Record<string, unknown> {
	const origin = input.siteUrl.trim().replace(/\/$/, "");
	const searchPath = input.searchPath ?? "/szukaj?q={search_term_string}";
	return {
		"@context": "https://schema.org",
		"@type": "WebSite",
		name: input.name,
		url: origin,
		potentialAction: {
			"@type": "SearchAction",
			target: `${origin}${searchPath.replace("{search_term_string}", "{search_term_string}")}`,
			"query-input": "required name=search_term_string",
		},
	};
}

export function localBusinessJsonLd(input: LocalBusinessJsonLdInput): Record<string, unknown> {
	const origin = input.siteUrl.trim().replace(/\/$/, "");
	const pagePath = input.pagePath ?? "/kontakt";
	return {
		"@context": "https://schema.org",
		"@type": "LocalBusiness",
		name: input.name,
		url: `${origin}${pagePath}`,
		...(input.imageUrl ? { image: input.imageUrl } : {}),
		...(input.email ? { email: input.email } : {}),
		...(input.telephone ? { telephone: input.telephone } : {}),
		...(input.address
			? {
					address: {
						"@type": "PostalAddress",
						...input.address,
					},
				}
			: {}),
		...(input.openingHours?.length
			? {
					openingHoursSpecification: input.openingHours.map((slot) => ({
						"@type": "OpeningHoursSpecification",
						dayOfWeek: slot.dayOfWeek,
						opens: slot.opens,
						closes: slot.closes,
					})),
				}
			: {}),
		...(input.sameAs?.length ? { sameAs: input.sameAs } : {}),
	};
}

export function productJsonLd(input: ProductJsonLdInput): Record<string, unknown> {
	const origin = input.siteUrl.trim().replace(/\/$/, "");
	const productUrl = `${origin}${input.path}`;
	const currency = input.currency ?? "PLN";
	const availability = input.inStock
		? "https://schema.org/InStock"
		: "https://schema.org/OutOfStock";
	const priceValidUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
		.toISOString()
		.slice(0, 10);
	const sellerOrg = { "@type": "Organization", name: input.brandName };

	const offers =
		input.lowPrice === input.highPrice
			? {
					"@type": "Offer",
					price: input.lowPrice,
					priceCurrency: currency,
					availability,
					itemCondition: "https://schema.org/NewCondition",
					url: productUrl,
					priceValidUntil,
					seller: sellerOrg,
				}
			: {
					"@type": "AggregateOffer",
					lowPrice: input.lowPrice,
					highPrice: input.highPrice,
					offerCount: input.offerCount ?? (input.lowPrice === input.highPrice ? 1 : 2),
					priceCurrency: currency,
					availability,
					itemCondition: "https://schema.org/NewCondition",
					url: productUrl,
					priceValidUntil,
					seller: sellerOrg,
				};

	return {
		"@context": "https://schema.org",
		"@type": "Product",
		name: input.name,
		...(input.description ? { description: input.description } : {}),
		image: input.images,
		url: productUrl,
		sku: input.sku,
		brand: { "@type": "Brand", name: input.brandName },
		offers,
	};
}

export function faqPageJsonLd(faq: FaqItem[]): Record<string, unknown> | null {
	if (!faq.length) return null;
	const sorted = [...faq].sort((a, b) => a.order - b.order);
	return {
		"@context": "https://schema.org",
		"@type": "FAQPage",
		mainEntity: sorted.map((item) => ({
			"@type": "Question",
			name: item.question,
			acceptedAnswer: {
				"@type": "Answer",
				text: item.answer,
			},
		})),
	};
}

export function breadcrumbListJsonLd(
	siteUrl: string,
	items: BreadcrumbItem[],
): Record<string, unknown> {
	const origin = siteUrl.trim().replace(/\/$/, "");
	return {
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		itemListElement: items.map((item, index) => ({
			"@type": "ListItem",
			position: index + 1,
			name: item.label,
			...(item.href ? { item: `${origin}${item.href}` } : {}),
		})),
	};
}
