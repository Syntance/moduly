"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getModulyConfig } from "@moduly/magazyn-core/config";
import { AdminApiError, AdminUnauthorizedError } from "@moduly/magazyn-core";
import { siteSettingsSchema } from "@moduly/cms/parsers";
import type { SeoMeta } from "@moduly/types";
import { revalidateContentCache } from "../revalidate-content";
import { saveGlobalSeoSettings, savePageSeo } from "./seo-store";
import type { SaveContentState } from "../content-actions";

export type SaveSeoState = SaveContentState;

const seoFieldsSchema = z.object({
	metaTitle: z.string().max(70).optional(),
	metaDescription: z.string().max(160).optional(),
	ogTitle: z.string().optional(),
	ogDescription: z.string().optional(),
	ogImageUrl: z.string().optional(),
	canonicalUrl: z.string().optional(),
	noIndex: z.boolean().optional(),
	noFollow: z.boolean().optional(),
});

const globalSeoPayloadSchema = z.object({
	title: z.string().min(1),
	description: z.string(),
	titleTemplate: z.string().optional(),
	defaultOgImageUrl: z.string().optional(),
	googleSiteVerification: z.string().optional(),
	seo: seoFieldsSchema.optional(),
});

export async function saveGlobalSeoAction(
	payload: z.infer<typeof globalSeoPayloadSchema>,
): Promise<SaveSeoState> {
	const parsed = globalSeoPayloadSchema.safeParse(payload);
	if (!parsed.success) {
		return { ok: false, error: parsed.error.issues[0]?.message ?? "Błędne dane." };
	}

	try {
		const settings = siteSettingsSchema.parse({
			...parsed.data,
			seo: parsed.data.seo,
		});
		await saveGlobalSeoSettings(settings);
	} catch (error) {
		if (error instanceof AdminUnauthorizedError) redirect(`${getModulyConfig().basePath}/login`);
		if (error instanceof AdminApiError) return { ok: false, error: error.message };
		return { ok: false, error: "Nie udało się zapisać SEO. Spróbuj ponownie." };
	}

	await revalidateContentCache(["/"]);
	return { ok: true, error: null };
}

export async function savePageSeoAction(
	pageId: string,
	seo: SeoMeta,
	path: string,
): Promise<SaveSeoState> {
	const parsed = seoFieldsSchema.safeParse(seo);
	if (!parsed.success) {
		return { ok: false, error: parsed.error.issues[0]?.message ?? "Błędne dane SEO." };
	}

	try {
		await savePageSeo(pageId, parsed.data);
	} catch (error) {
		if (error instanceof AdminUnauthorizedError) redirect(`${getModulyConfig().basePath}/login`);
		if (error instanceof AdminApiError) return { ok: false, error: error.message };
		return { ok: false, error: "Nie udało się zapisać SEO podstrony." };
	}

	await revalidateContentCache([path]);
	return { ok: true, error: null };
}
