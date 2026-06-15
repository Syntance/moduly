"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getModulyConfig } from "@moduly/magazyn-core/config";
import { AdminApiError, AdminUnauthorizedError } from "@moduly/magazyn-core";
import { recordAudit } from "@moduly/magazyn-core";
import { revalidateStorefrontMedusaCache } from "@moduly/magazyn-core";
import { slugify } from "@moduly/magazyn-core";
import { type CategoryInput, createCategory, deleteCategory, reorderCategories, updateCategory } from "./store";

export type CategoryActionState = { error: string | null; ok: boolean };

const PATH = `${getModulyConfig().basePath}/panel/kategorie`;

const SHOP_PATHS = [
	"/sklep",
	"/sklep/gotowe-wzory",
	"/sklep/certyfikaty",
	"/sklep/logo-3d",
] as const;

async function revalidateCategoryCaches(): Promise<void> {
	revalidateTag("medusa-categories", "max");
	revalidateTag("medusa-products", "max");
	await revalidateStorefrontMedusaCache(["medusa-categories", "medusa-products"]);
	for (const shopPath of SHOP_PATHS) {
		revalidatePath(shopPath);
	}
}

const schema = z.object({
	id: z.string().trim().optional(),
	name: z.string().trim().min(2, "Nazwa musi mieć min. 2 znaki."),
	description: z.string(),
	isActive: z.boolean(),
});

export type CategoryPayload = z.input<typeof schema>;

export async function saveCategoryAction(payload: CategoryPayload): Promise<CategoryActionState> {
	const parsed = schema.safeParse(payload);
	if (!parsed.success) {
		return { ok: false, error: parsed.error.issues[0]?.message ?? "Błędne dane." };
	}

	const data = parsed.data;
	const input: CategoryInput = {
		name: data.name,
		handle: slugify(data.name),
		description: data.description,
		isActive: data.isActive,
	};

	try {
		if (data.id) await updateCategory(data.id, input);
		else await createCategory(input);
	} catch (error) {
		if (error instanceof AdminUnauthorizedError) redirect(`${getModulyConfig().basePath}/login`);
		if (error instanceof AdminApiError) return { ok: false, error: error.message };
		return { ok: false, error: "Nie udało się zapisać kategorii." };
	}

	revalidatePath(PATH);
	await revalidateCategoryCaches();
	return { ok: true, error: null };
}

export async function deleteCategoryAction(id: string): Promise<CategoryActionState> {
	try {
		await deleteCategory(id);
		await recordAudit("category.delete", { target: id });
	} catch (error) {
		if (error instanceof AdminUnauthorizedError) redirect(`${getModulyConfig().basePath}/login`);
		if (error instanceof AdminApiError) return { ok: false, error: error.message };
		return { ok: false, error: "Nie udało się usunąć kategorii." };
	}

	revalidatePath(PATH);
	await revalidateCategoryCaches();
	return { ok: true, error: null };
}

const reorderSchema = z.object({
	orderedIds: z.array(z.string().trim().min(1)).min(1),
});

export async function reorderCategoriesAction(orderedIds: string[]): Promise<CategoryActionState> {
	const parsed = reorderSchema.safeParse({ orderedIds });
	if (!parsed.success) {
		return { ok: false, error: "Nieprawidłowa kolejność kategorii." };
	}

	try {
		await reorderCategories(parsed.data.orderedIds);
	} catch (error) {
		if (error instanceof AdminUnauthorizedError) redirect(`${getModulyConfig().basePath}/login`);
		if (error instanceof AdminApiError) return { ok: false, error: error.message };
		return { ok: false, error: "Nie udało się zapisać kolejności." };
	}

	revalidatePath(PATH);
	await revalidateCategoryCaches();
	return { ok: true, error: null };
}
