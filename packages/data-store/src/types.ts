/** Surowy blob CMS przed parsowaniem Zod — wartości z persystencji (JSON-stringi lub obiekty). */
export type RawStoreMetadataBlob = {
	siteSettings: unknown;
	pageSeo: unknown;
	pageContent: unknown;
	globalContent: unknown;
};

export type FetchMetadataBlobOptions = {
	/** Tag ISR Next.js — domyślnie `moduly-content`. */
	cacheTag?: string;
	revalidateSeconds?: number;
};
