"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getModulyConfig } from "@moduly/magazyn-core/config";
import {
	AdminApiError,
	AdminUnauthorizedError,
	adminUpload,
	recordAudit,
	requireAdminSession,
	revalidateStorefrontMedusaCache,
	resolveMedusaMediaUrls,
	slugify,
	uploadCmsAssetFile,
} from "@moduly/magazyn-core";
import {
	createAdminProduct,
	deleteAdminProduct,
	duplicateAdminProduct,
	type ProductFormValues,
	updateAdminProduct,
} from "./store";

export type SaveProductState = { error: string | null; ok: boolean };

function productsPath(): string {
	return `${getModulyConfig().basePath}/panel/produkty`;
}

const productSchema = z
	.object({
		id: z.string().trim().optional(),
		handle: z.string().trim().optional(),
		title: z.string().trim().min(2, "Nazwa musi mieć min. 2 znaki."),
		status: z.enum(["draft", "published"]),
		categoryIds: z.array(z.string().trim().min(1)).default([]),
		description: z.string(),
		price: z.number().nonnegative().nullable(),
		images: z.array(z.string().url()),
		seo: z
			.object({
				metaTitle: z.string().optional(),
				metaDescription: z.string().optional(),
				ogTitle: z.string().optional(),
				ogDescription: z.string().optional(),
				ogImageUrl: z.string().optional(),
				canonicalUrl: z.string().optional(),
				noIndex: z.boolean().optional(),
				noFollow: z.boolean().optional(),
			})
			.default({}),
		productFaq: z
			.array(
				z.object({
					id: z.string().min(1),
					question: z.string().min(1),
					answer: z.string().min(1),
					order: z.number().int(),
				}),
			)
			.default([]),
		pdpCalloutEnabled: z.boolean().default(false),
		pdpCallout: z.string().max(500).default(""),
		minOrderQuantity: z.number().int().min(1).max(99).default(1),
	})
	.superRefine((data, ctx) => {
		if (data.pdpCalloutEnabled && !(data.pdpCallout ?? "").trim()) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Podaj treść calloutu lub odznacz opcję.",
				path: ["pdpCallout"],
			});
		}
	});

export type ProductPayload = z.input<typeof productSchema>;

function toValues(data: z.infer<typeof productSchema>): ProductFormValues {
	const handle =
		data.id && data.handle?.trim() ? data.handle.trim() : slugify(data.title);

	return {
		title: data.title,
		handle,
		status: data.status,
		categoryIds: data.categoryIds ?? [],
		description: data.description,
		price: data.price,
		images: data.images,
		seo: data.seo ?? {},
		productFaq: data.productFaq ?? [],
		pdpCalloutEnabled: data.pdpCalloutEnabled ?? false,
		pdpCallout: data.pdpCallout ?? "",
		minOrderQuantity: data.minOrderQuantity ?? 1,
	};
}

export async function saveProductAction(payload: ProductPayload): Promise<SaveProductState> {
	const parsed = productSchema.safeParse(payload);
	if (!parsed.success) {
		return { ok: false, error: parsed.error.issues[0]?.message ?? "Błędne dane formularza." };
	}

	const data = parsed.data;
	if (data.price == null) return { ok: false, error: "Podaj cenę." };

	const values = toValues(data);
	const productHandle = values.handle;
	const basePath = getModulyConfig().basePath;

	try {
		if (data.id) {
			await updateAdminProduct(data.id, values, productHandle);
		} else {
			await createAdminProduct(values);
		}
	} catch (error) {
		if (error instanceof AdminUnauthorizedError) redirect(`${basePath}/login`);
		if (error instanceof AdminApiError) return { ok: false, error: error.message };
		return { ok: false, error: "Nie udało się zapisać produktu. Spróbuj ponownie." };
	}

	revalidateTag("medusa-products", "max");
	revalidateTag("medusa-categories", "max");
	await revalidateStorefrontMedusaCache();
	revalidatePath(productsPath());

	if (data.id) {
		revalidatePath(`${productsPath()}/${data.id}`);
		return { ok: true, error: null };
	}

	redirect(productsPath());
}

export async function deleteProductAction(id: string): Promise<void> {
	try {
		await deleteAdminProduct(id);
		await recordAudit("product.delete", { target: id });
	} catch (error) {
		if (error instanceof AdminUnauthorizedError) redirect(`${getModulyConfig().basePath}/login`);
		throw error;
	}
	revalidateTag("medusa-products", "max");
	revalidateTag("medusa-categories", "max");
	revalidatePath(productsPath());
}

export type DuplicateProductState = { ok: boolean; error: string | null; newId?: string };

export async function duplicateProductAction(id: string): Promise<DuplicateProductState> {
	let newId: string;
	try {
		newId = await duplicateAdminProduct(id);
		await recordAudit("product.duplicate", { target: id, meta: { newId } });
	} catch (error) {
		if (error instanceof AdminUnauthorizedError) redirect(`${getModulyConfig().basePath}/login`);
		if (error instanceof AdminApiError) return { ok: false, error: error.message };
		if (error instanceof Error) return { ok: false, error: error.message };
		return { ok: false, error: "Nie udało się powielić produktu." };
	}

	revalidateTag("medusa-products", "max");
	revalidateTag("medusa-categories", "max");
	await revalidateStorefrontMedusaCache();
	revalidatePath(productsPath());
	revalidatePath(`${productsPath()}/${newId}`);

	return { ok: true, error: null, newId };
}

export type UploadState = { urls: string[]; error: string | null };

export async function uploadImagesAction(formData: FormData): Promise<UploadState> {
	const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
	if (files.length === 0) return { urls: [], error: "Nie wybrano plików." };

	try {
		await requireAdminSession();
		const urls: string[] = [];
		for (const file of files) {
			try {
				const result = await uploadCmsAssetFile(file);
				urls.push(result.url);
			} catch (inner) {
				if (inner instanceof Error && inner.message === "MEDUSA_UPLOAD_UNAVAILABLE") {
					const fallback = resolveMedusaMediaUrls(await adminUpload([file]));
					if (fallback[0]) urls.push(fallback[0]);
					continue;
				}
				if (inner instanceof Error && !inner.message.startsWith("MEDUSA_")) {
					return { urls: [], error: inner.message };
				}
				throw inner;
			}
		}
		return { urls, error: null };
	} catch (error) {
		if (error instanceof AdminUnauthorizedError) redirect(`${getModulyConfig().basePath}/login`);
		if (error instanceof AdminApiError) return { urls: [], error: error.message };
		return { urls: [], error: "Upload nie powiódł się." };
	}
}
