import { MeiliSearch, type Index } from "meilisearch";

interface MeilisearchOptions {
  host: string;
  adminKey: string;
}

interface ProductDocument {
  id: string;
  title: string;
  handle: string;
  description: string;
  thumbnail: string | null;
  categories: string[];
  tags: string[];
  variant_prices: number[];
  created_at: string;
  updated_at: string;
}

const PRODUCTS_INDEX = "products";

const SEARCHABLE_ATTRIBUTES = ["title", "description", "categories", "tags"];
const FILTERABLE_ATTRIBUTES = ["categories", "tags", "variant_prices"];
const SORTABLE_ATTRIBUTES = ["created_at", "variant_prices", "title"];
const DISPLAYED_ATTRIBUTES = [
  "id",
  "title",
  "handle",
  "description",
  "thumbnail",
  "categories",
  "tags",
  "variant_prices",
];

export default class MeilisearchService {
  static identifier = "meilisearch";

  private client: MeiliSearch;

  constructor(_container: Record<string, unknown>, options: MeilisearchOptions) {
    this.client = new MeiliSearch({
      host: options.host,
      apiKey: options.adminKey,
    });
  }

  async ensureIndex(): Promise<Index<ProductDocument>> {
    try {
      return await this.client.getIndex(PRODUCTS_INDEX);
    } catch {
      await this.client.createIndex(PRODUCTS_INDEX, { primaryKey: "id" });
      const index = this.client.index<ProductDocument>(PRODUCTS_INDEX);

      await index.updateSearchableAttributes(SEARCHABLE_ATTRIBUTES);
      await index.updateFilterableAttributes(FILTERABLE_ATTRIBUTES);
      await index.updateSortableAttributes(SORTABLE_ATTRIBUTES);
      await index.updateDisplayedAttributes(DISPLAYED_ATTRIBUTES);

      return index;
    }
  }

  async upsertProduct(product: ProductDocument): Promise<void> {
    const index = await this.ensureIndex();
    await index.addDocuments([product]);
  }

  async upsertProducts(products: ProductDocument[]): Promise<void> {
    const index = await this.ensureIndex();
    await index.addDocuments(products);
  }

  async deleteProduct(productId: string): Promise<void> {
    const index = await this.ensureIndex();
    await index.deleteDocument(productId);
  }

  async search(
    query: string,
    options?: {
      filter?: string[];
      sort?: string[];
      limit?: number;
      offset?: number;
    },
  ) {
    const index = await this.ensureIndex();
    return index.search(query, {
      filter: options?.filter,
      sort: options?.sort,
      limit: options?.limit ?? 20,
      offset: options?.offset ?? 0,
      attributesToHighlight: ["title", "description"],
    });
  }
}
