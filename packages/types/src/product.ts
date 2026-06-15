export interface ProductSearchResult {
	id: string;
	title: string;
	handle: string;
	thumbnail?: string;
	description: string;
	/** Ceny wariantów w groszach. */
	variant_prices: number[];
}
