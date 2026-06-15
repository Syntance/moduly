import "server-only";
import { randomUUID } from "node:crypto";
import { cache } from "react";
import { getModulyConfig } from "@moduly/magazyn-core/config";
import {
	adminFetch,
	compareCategoriesBySortOrder,
	isShopSectionRoot,
	LISTING_CATEGORY_HANDLE,
	resolveMedusaMediaUrl,
	resolveMedusaMediaUrls,
	slugify,
} from "@moduly/magazyn-core";
import {
	parseProductFaqFromMetadata,
	parseProductSeoFromMetadata,
	serializeProductFaqForMetadata,
	serializeProductSeoForMetadata,
} from "@moduly/cms/parsers";
import type { ProductFaqItem, ProductSeoMeta } from "@moduly/types";
import {
	parseMinOrderQuantity,
	serializeMinOrderQuantityForMetadata,
	MIN_ORDER_QUANTITY_META_KEY,
} from "./lib/min-order-quantity";
import {
	parsePdpCallout,
	parsePdpCalloutEnabled,
	serializePdpCalloutForMetadata,
} from "./lib/pdp-callout";

export type ProductStatus = "draft" | "published";

export type ProductFormValues = {
	title: string;
	handle: string;
	status: ProductStatus;
	categoryIds: string[];
	description: string;
	/** Cena w groszach (integer). */
	price: number | null;
	images: string[];
	seo: ProductSeoMeta;
	productFaq: ProductFaqItem[];
	pdpCalloutEnabled: boolean;
	pdpCallout: string;
	minOrderQuantity: number;
};

export type AdminProductRow = {
	id: string;
	title: string;
	handle: string;
	status: ProductStatus;
	thumbnail: string | null;
	categoryName: string | null;
	price: number | null;
};

export type AdminProductDetail = ProductFormValues & {
	id: string;
	variantId: string | null;
	priceId: string | null;
	metadata: Record<string, unknown>;
};

export type CategoryOption = { id: string; name: string };

function currencyCode(): string {
	return getModulyConfig().commerce.currency;
}

type MedusaPrice = { id?: string; currency_code: string; amount: number };
type MedusaVariant = {
	id: string;
	title?: string;
	prices?: MedusaPrice[] | null;
};
type MedusaProduct = {
	id: string;
	title: string;
	handle: string;
	status: ProductStatus;
	description?: string | null;
	thumbnail?: string | null;
	images?: Array<{ url?: string | null }> | null;
	categories?: Array<{ id: string; name: string }> | null;
	variants?: MedusaVariant[] | null;
	metadata?: Record<string, unknown> | null;
};

function toMinorUnits(amount: number | null | undefined): number {
	return Math.round((amount ?? 0) * 100);
}

function minorUnitsToPln(minor: number): number {
	return Math.round(minor) / 100;
}

function priceOf(variant: MedusaVariant | undefined, currency: string): number | null {
	const price = variant?.prices?.find((p) => p.currency_code === currency);
	return price ? toMinorUnits(price.amount) : null;
}

function priceIdOf(variant: MedusaVariant | undefined, currency: string): string | null {
	const price = variant?.prices?.find((p) => p.currency_code === currency);
	return price?.id ?? null;
}

const LIST_FIELDS =
	"id,title,handle,status,thumbnail,images.url,categories.id,categories.name,variants.prices.id,variants.prices.amount,variants.prices.currency_code";

const DETAIL_FIELDS =
	"id,title,handle,status,description,thumbnail,images.url,categories.id,categories.name,metadata,variants.id,variants.title,variants.prices.id,variants.prices.amount,variants.prices.currency_code";

function orderedProductImages(product: MedusaProduct): string[] {
	const urls = resolveMedusaMediaUrls((product.images ?? []).map((i) => i.url));
	const thumb = resolveMedusaMediaUrl(product.thumbnail);
	if (!thumb) return urls;
	const rest = urls.filter((u) => u !== thumb);
	return [thumb, ...rest];
}

function thumbnailOf(product: MedusaProduct): string | null {
	return orderedProductImages(product)[0] ?? null;
}

function productImagesPayload(urls: string[]): {
	thumbnail: string | null;
	images: Array<{ url: string }>;
} {
	const resolved = resolveMedusaMediaUrls(urls);
	const thumbnail = resolved[0] ?? null;
	return {
		thumbnail,
		images: resolved.map((url) => ({ url })),
	};
}

export const getStoreConfig = cache(async (): Promise<{
	salesChannelId: string | null;
	shippingProfileId: string | null;
}> => {
	const [channels, profiles] = await Promise.all([
		adminFetch<{ sales_channels: Array<{ id: string }> }>("/admin/sales-channels?limit=1"),
		adminFetch<{ shipping_profiles: Array<{ id: string }> }>("/admin/shipping-profiles?limit=1"),
	]);
	return {
		salesChannelId: channels.sales_channels[0]?.id ?? null,
		shippingProfileId: profiles.shipping_profiles[0]?.id ?? null,
	};
});

export const listCategoryOptions = cache(async (): Promise<CategoryOption[]> => {
	const data = await adminFetch<{
		product_categories: Array<{
			id: string;
			name: string;
			handle: string;
			parent_category_id?: string | null;
			metadata?: Record<string, unknown> | null;
		}>;
	}>("/admin/product-categories?limit=100&fields=id,name,handle,parent_category_id,metadata");

	const gotoweId = data.product_categories.find(
		(c) => c.handle === LISTING_CATEGORY_HANDLE.gotoweWzory,
	)?.id;

	return data.product_categories
		.filter((c) => !isShopSectionRoot(c))
		.filter((c) => !gotoweId || c.parent_category_id === gotoweId)
		.sort(compareCategoriesBySortOrder)
		.map((c) => ({ id: c.id, name: c.name }));
});

export async function listAdminProducts(): Promise<AdminProductRow[]> {
	const data = await adminFetch<{ products: MedusaProduct[] }>(
		`/admin/products?limit=200&fields=${LIST_FIELDS}`,
	);
	const currency = currencyCode();

	return data.products.map((product) => {
		const variant = product.variants?.[0];
		return {
			id: product.id,
			title: product.title,
			handle: product.handle,
			status: product.status,
			thumbnail: thumbnailOf(product),
			categoryName: product.categories?.length
				? product.categories.map((c) => c.name).join(", ")
				: null,
			price: priceOf(variant, currency),
		};
	});
}

export async function getAdminProduct(id: string): Promise<AdminProductDetail | null> {
	const data = await adminFetch<{ product: MedusaProduct }>(
		`/admin/products/${id}?fields=${DETAIL_FIELDS}`,
	);
	const product = data.product;
	if (!product) return null;

	const variant = product.variants?.[0];
	const metadata = (product.metadata ?? {});
	const currency = currencyCode();

	return {
		id: product.id,
		variantId: variant?.id ?? null,
		priceId: priceIdOf(variant, currency),
		title: product.title,
		handle: product.handle,
		status: product.status,
		categoryIds: (product.categories ?? []).map((c) => c.id),
		description: product.description ?? "",
		price: priceOf(variant, currency),
		images: orderedProductImages(product),
		seo: parseProductSeoFromMetadata(metadata) ?? {},
		productFaq: parseProductFaqFromMetadata(metadata),
		pdpCalloutEnabled: parsePdpCalloutEnabled(metadata),
		pdpCallout: parsePdpCallout(metadata),
		minOrderQuantity: parseMinOrderQuantity(metadata),
		metadata,
	};
}

function buildPrices(values: ProductFormValues, existingPriceId?: string | null): MedusaPrice[] {
	if (values.price == null) return [];
	const amount = minorUnitsToPln(values.price);
	const price: MedusaPrice = { currency_code: currencyCode(), amount };
	if (existingPriceId) price.id = existingPriceId;
	return [price];
}

async function syncProductBasePrice(productId: string, priceMinor: number): Promise<void> {
	await adminFetch(`/admin/products/${productId}/base-price`, {
		method: "POST",
		body: JSON.stringify({ base_price: minorUnitsToPln(priceMinor) }),
	});
}

async function syncProductMetadata(productId: string, values: ProductFormValues): Promise<void> {
	const current = await adminFetch<{ product: MedusaProduct }>(
		`/admin/products/${productId}?fields=metadata`,
	);
	const existingMeta = (current.product.metadata ?? {});

	await adminFetch(`/admin/products/${productId}`, {
		method: "POST",
		body: JSON.stringify({
			metadata: {
				...existingMeta,
				...serializeProductSeoForMetadata(values.seo),
				product_faq:
					values.productFaq.length > 0
						? serializeProductFaqForMetadata(values.productFaq)
						: undefined,
				...serializePdpCalloutForMetadata(values.pdpCalloutEnabled, values.pdpCallout),
				[MIN_ORDER_QUANTITY_META_KEY]: serializeMinOrderQuantityForMetadata(
					values.minOrderQuantity,
				),
			},
		}),
	});
}

export async function createAdminProduct(values: ProductFormValues): Promise<string> {
	const { salesChannelId, shippingProfileId } = await getStoreConfig();
	const imagePayload = productImagesPayload(values.images);

	const body: Record<string, unknown> = {
		title: values.title.trim(),
		handle: values.handle.trim(),
		status: values.status,
		description: values.description.trim(),
		thumbnail: imagePayload.thumbnail,
		images: imagePayload.images,
		variants: [
			{
				title: "Standard",
				manage_inventory: false,
				prices: buildPrices(values),
			},
		],
	};

	if (values.categoryIds.length > 0) {
		body.categories = values.categoryIds.map((id) => ({ id }));
	}
	if (shippingProfileId) body.shipping_profile_id = shippingProfileId;
	if (salesChannelId) body.sales_channels = [{ id: salesChannelId }];

	const data = await adminFetch<{ product: { id: string } }>("/admin/products", {
		method: "POST",
		body: JSON.stringify(body),
	});
	const productId = data.product.id;
	if (values.price != null) {
		await syncProductBasePrice(productId, values.price);
	}
	await syncProductMetadata(productId, values);
	return productId;
}

export async function updateAdminProduct(
	id: string,
	values: ProductFormValues,
	existingHandle?: string | null,
): Promise<void> {
	const imagePayload = productImagesPayload(values.images);

	const body: Record<string, unknown> = {
		title: values.title.trim(),
		status: values.status,
		description: values.description.trim(),
		thumbnail: imagePayload.thumbnail,
		images: imagePayload.images,
		categories: values.categoryIds.map((cid) => ({ id: cid })),
	};

	if (existingHandle) {
		body.handle = existingHandle;
	} else {
		body.handle = values.handle.trim();
	}

	await adminFetch(`/admin/products/${id}`, { method: "POST", body: JSON.stringify(body) });
	await syncProductMetadata(id, values);

	if (values.price != null) {
		await syncProductBasePrice(id, values.price);
	}
}

function buildDuplicateProductTitle(title: string): string {
	const trimmed = title.trim();
	const copySuffix = " (kopia)";
	if (trimmed.toLowerCase().endsWith(copySuffix)) {
		return `${trimmed} 2`;
	}
	return `${trimmed}${copySuffix}`;
}

function buildDuplicateProductHandle(sourceHandle: string, title: string): string {
	const fromTitle = slugify(buildDuplicateProductTitle(title));
	if (fromTitle) return fromTitle;
	const fromHandle = slugify(`${sourceHandle}-kopia`);
	if (fromHandle) return fromHandle;
	return `produkt-kopia-${Date.now().toString(36)}`;
}

function adminDetailToDuplicateFormValues(product: AdminProductDetail): ProductFormValues {
	return {
		title: buildDuplicateProductTitle(product.title),
		handle: buildDuplicateProductHandle(product.handle, product.title),
		status: "draft",
		categoryIds: [...product.categoryIds],
		description: product.description,
		price: product.price,
		images: [...product.images],
		seo: { ...product.seo },
		productFaq: product.productFaq.map((item) => ({
			...item,
			id: `faq_${randomUUID()}`,
		})),
		pdpCalloutEnabled: product.pdpCalloutEnabled,
		pdpCallout: product.pdpCallout,
		minOrderQuantity: product.minOrderQuantity,
	};
}

export async function duplicateAdminProduct(sourceId: string): Promise<string> {
	const source = await getAdminProduct(sourceId);
	if (!source) {
		throw new Error("Nie znaleziono produktu do powielenia.");
	}
	if (source.price == null) {
		throw new Error("Produkt nie ma ceny — uzupełnij ją przed powieleniem.");
	}
	return createAdminProduct(adminDetailToDuplicateFormValues(source));
}

export async function deleteAdminProduct(id: string): Promise<void> {
	await adminFetch(`/admin/products/${id}`, { method: "DELETE" });
}
