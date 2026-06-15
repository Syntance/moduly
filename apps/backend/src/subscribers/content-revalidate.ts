import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";

/**
 * Revalidacja storefrontu po zmianach treści CMS (metadata Medusy / magazyn).
 * Wymaga STOREFRONT_REVALIDATE_URL + MEDUSA_REVALIDATE_SECRET.
 */
export default async function contentRevalidateHandler({
  event,
}: SubscriberArgs<{ id?: string; page_id?: string }>) {
  const url = process.env.STOREFRONT_REVALIDATE_URL;
  const secret = process.env.MEDUSA_REVALIDATE_SECRET;

  if (!url || !secret) return;

  const tags = [
    "cms-content",
    "cms-global",
    "cms-forms",
    "site-settings",
  ];

  const pageId = event.data?.page_id ?? event.data?.id;
  if (pageId) {
    tags.push(`cms-page-${pageId}`);
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-secret": secret,
      },
      body: JSON.stringify({
        tags,
        reason: event.name,
        id: pageId,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      console.error(
        "[content-revalidate] storefront responded",
        res.status,
        await res.text().catch(() => ""),
      );
    }
  } catch (e) {
    console.error("[content-revalidate] fetch failed", e);
  }
}

export const config: SubscriberConfig = {
  event: [
    "product-config.updated",
    "product.updated",
  ],
};
