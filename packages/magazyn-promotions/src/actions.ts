"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getModulyConfig } from "@moduly/magazyn-core/config";
import { AdminApiError, AdminUnauthorizedError } from "@moduly/magazyn-core";
import { recordAudit } from "@moduly/magazyn-core";
import {
	createPromoCode,
	deletePromoCode,
	updatePromoCode,
	type PromoCodeInput,
} from "./store";

export type PromoActionState = { error: string | null; ok: boolean };

const PATH = `${getModulyConfig().basePath}/panel/kody-promocyjne`;

const schema = z.object({
	id: z.string().trim().optional(),
	code: z.string().trim().min(2, "Kod musi mieć min. 2 znaki."),
	status: z.enum(["active", "draft"]),
	discountType: z.enum(["percentage", "fixed", "none"]),
	discountValueMajor: z.number().min(0),
	productIds: z.array(z.string().trim().min(1)),
	freeShippingEnabled: z.boolean(),
	freeShippingMinAmountMajor: z.number().min(0).nullable(),
});

export type PromoPayload = z.input<typeof schema>;

function toInput(data: z.infer<typeof schema>): PromoCodeInput {
	return {
		code: data.code,
		status: data.status,
		discountType: data.discountType,
		discountValueMajor: data.discountValueMajor,
		productIds: data.productIds,
		freeShippingEnabled: data.freeShippingEnabled,
		freeShippingMinAmountMajor: data.freeShippingMinAmountMajor,
	};
}

export async function savePromoCodeAction(payload: PromoPayload): Promise<PromoActionState> {
	const parsed = schema.safeParse(payload);
	if (!parsed.success) {
		return { ok: false, error: parsed.error.issues[0]?.message ?? "Błędne dane." };
	}

	const input = toInput(parsed.data);

	try {
		if (parsed.data.id) await updatePromoCode(parsed.data.id, input);
		else await createPromoCode(input);
	} catch (error) {
		if (error instanceof AdminUnauthorizedError) redirect(`${getModulyConfig().basePath}/login`);
		if (error instanceof AdminApiError) return { ok: false, error: error.message };
		if (error instanceof Error) return { ok: false, error: error.message };
		return { ok: false, error: "Nie udało się zapisać kodu promocyjnego." };
	}

	revalidatePath(PATH);
	if (parsed.data.productIds.length > 0) {
		for (const productId of parsed.data.productIds) {
			revalidatePath(`${getModulyConfig().basePath}/panel/produkty/${productId}`);
		}
	}
	return { ok: true, error: null };
}

export async function deletePromoCodeAction(id: string): Promise<PromoActionState> {
	try {
		await deletePromoCode(id);
		await recordAudit("promo.delete", { target: id });
	} catch (error) {
		if (error instanceof AdminUnauthorizedError) redirect(`${getModulyConfig().basePath}/login`);
		if (error instanceof AdminApiError) return { ok: false, error: error.message };
		if (error instanceof Error) return { ok: false, error: error.message };
		return { ok: false, error: "Nie udało się usunąć kodu promocyjnego." };
	}

	revalidatePath(PATH);
	return { ok: true, error: null };
}
