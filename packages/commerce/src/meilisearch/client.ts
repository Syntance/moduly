import { MeiliSearch } from "meilisearch";

const MEILISEARCH_HOST =
	process.env.NEXT_PUBLIC_MEILISEARCH_HOST ?? "http://localhost:7700";
const MEILISEARCH_SEARCH_KEY = process.env.NEXT_PUBLIC_MEILISEARCH_SEARCH_KEY ?? "";

export const meilisearchClient = new MeiliSearch({
	host: MEILISEARCH_HOST,
	apiKey: MEILISEARCH_SEARCH_KEY,
});

export const productsIndex = meilisearchClient.index("products");

export async function searchProducts(
	query: string,
	options?: {
		filter?: string[];
		sort?: string[];
		limit?: number;
		offset?: number;
	},
) {
	return productsIndex.search(query, {
		filter: options?.filter,
		sort: options?.sort,
		limit: options?.limit ?? 20,
		offset: options?.offset ?? 0,
		attributesToHighlight: ["title", "description"],
	});
}
