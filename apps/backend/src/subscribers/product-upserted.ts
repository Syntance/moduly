import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import type { IProductModuleService, ProductDTO } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import type MeilisearchService from "../modules/meilisearch/service";
import { captureError } from "../lib/sentry";

type ProductVariant = NonNullable<ProductDTO["variants"]>[number];
type ProductCategory = NonNullable<ProductDTO["categories"]>[number];
type ProductTag = NonNullable<ProductDTO["tags"]>[number];

/**
 * Meili dostaje tu uproszczony widok produktu: tytuł, opis, kategorie, tagi
 * i płaska lista kwot wariantów (do filtrów po cenie). Nie próbujemy pobierać
 * cen razem z produktem przez relację `variants.prices` — w Medusa v2
 * Pricing to osobny moduł, a `retrieveProduct` z taką relacją wywala
 * `TypeError: Cannot read properties of undefined (reading 'strategy')`
 * (MikroORM nie wie jak zjoinować cross-module). Zamiast tego pobieramy
 * price_set-y wariantów osobno przez `IPricingModuleService` — a jeśli to
 * padnie, lecimy z pustą listą cen (indeks Meili nadal ma sensowny rekord).
 */
export default async function productUpsertedHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const productService: IProductModuleService =
    container.resolve(Modules.PRODUCT);

  let product: ProductDTO;
  try {
    product = await productService.retrieveProduct(event.data.id, {
      relations: ["variants", "categories", "tags"],
    });
  } catch (e) {
    console.error("[product-upserted] retrieveProduct failed", e);
    captureError(e, {
      subscriber: "product-upserted",
      step: "retrieveProduct",
      productId: event.data.id,
    });
    return;
  }

  /**
   * Ceny (best-effort) — używamy Query API, które samo rozwiązuje
   * cross-module link variant → price_set → prices (nie da się go pobrać
   * `retrieveProduct` bo to inny moduł). Każdy fail kończymy pustą listą,
   * bo subscriber nigdy nie może wywrócić checkoutu ani innych workflow'ów.
   */
  let variantAmounts: number[] = [];
  try {
    const variantIds: string[] =
      product.variants?.map((v: ProductVariant) => v.id).filter(Boolean) ?? [];
    if (variantIds.length > 0) {
      const query = container.resolve(ContainerRegistrationKeys.QUERY) as {
        graph: (args: unknown) => Promise<{ data: unknown[] }>;
      };
      const { data } = await query.graph({
        entity: "variant",
        fields: ["id", "prices.amount", "prices.currency_code"],
        filters: { id: variantIds },
      });
      variantAmounts = (data as Array<{ prices?: Array<{ amount?: unknown }> }>)
        .flatMap((v) => v.prices?.map((p) => Number(p.amount)) ?? [])
        .filter((n): n is number => Number.isFinite(n));
    }
  } catch (e) {
    console.warn(
      "[product-upserted] pobranie cen wariantów nieudane — indeksuję bez cen",
      e,
    );
  }

  try {
    const meilisearch = container.resolve("meilisearch") as MeilisearchService;
    await meilisearch.upsertProduct({
      id: product.id,
      title: product.title,
      handle: product.handle,
      description: product.description ?? "",
      thumbnail: product.thumbnail,
      categories: product.categories?.map((c: ProductCategory) => c.name) ?? [],
      tags: product.tags?.map((t: ProductTag) => t.value) ?? [],
      variant_prices: variantAmounts,
      created_at: String(product.created_at ?? ""),
      updated_at: String(product.updated_at ?? ""),
    });
  } catch (e) {
    console.error("[product-upserted] meilisearch.upsertProduct", e);
    captureError(e, {
      subscriber: "product-upserted",
      step: "meilisearch",
      productId: product?.id,
    });
  }
}

export const config: SubscriberConfig = {
  event: ["product.created", "product.updated"],
};
