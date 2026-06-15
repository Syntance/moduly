"use server";

import { redirect } from "next/navigation";
import { getModulyConfig } from "@moduly/magazyn-core/config";
import { AdminApiError, AdminUnauthorizedError } from "@moduly/magazyn-core";
import { requireAdminSession } from "@moduly/magazyn-core";
import type { GlobalContent, PageContent, SiteSettings } from "@moduly/types";
import { revalidateContentCache, triggerCmsRedeploy } from "./revalidate-content";
import {
	saveGlobalContent,
	savePageContent,
	saveSiteSettingsPartial,
} from "./content-store";
import {
	globalContentSchema,
	pageContentSchema,
	prepareGlobalContentForSave,
	preparePageContentForSave,
	siteSettingsSchema,
} from "@moduly/cms/parsers";

export type SaveContentState = {
	ok: boolean;
	error: string | null;
};

export async function savePageContentAction(
	pageId: string,
	path: string,
	content: PageContent,
): Promise<SaveContentState> {
	const prepared = preparePageContentForSave(pageId, content);
	const parsed = pageContentSchema.safeParse(prepared);
	if (!parsed.success) {
		return { ok: false, error: parsed.error.issues[0]?.message ?? "Błędne dane CMS." };
	}

	try {
		await savePageContent(pageId, parsed.data);
	} catch (error) {
		if (error instanceof AdminUnauthorizedError) redirect(`${getModulyConfig().basePath}/login`);
		if (error instanceof AdminApiError) return { ok: false, error: error.message };
		return { ok: false, error: "Nie udało się zapisać treści podstrony." };
	}

	await revalidateContentCache([path]);
	return { ok: true, error: null };
}

export async function saveGlobalContentAction(
	global: GlobalContent,
	paths: string[] = ["/"],
): Promise<SaveContentState> {
	const prepared = prepareGlobalContentForSave(global);
	const parsed = globalContentSchema.safeParse(prepared);
	if (!parsed.success) {
		return {
			ok: false,
			error: parsed.error.issues[0]?.message ?? "Błędne dane globalne.",
		};
	}

	try {
		await saveGlobalContent(parsed.data);
	} catch (error) {
		if (error instanceof AdminUnauthorizedError) redirect(`${getModulyConfig().basePath}/login`);
		if (error instanceof AdminApiError) return { ok: false, error: error.message };
		return { ok: false, error: "Nie udało się zapisać treści globalnych." };
	}

	await revalidateContentCache(paths);
	return { ok: true, error: null };
}

export async function saveGlobalSiteSettingsAction(
	settings: SiteSettings,
): Promise<SaveContentState> {
	const parsed = siteSettingsSchema.safeParse(settings);
	if (!parsed.success) {
		return { ok: false, error: parsed.error.issues[0]?.message ?? "Błędne ustawienia." };
	}

	try {
		await saveSiteSettingsPartial(parsed.data);
	} catch (error) {
		if (error instanceof AdminUnauthorizedError) redirect(`${getModulyConfig().basePath}/login`);
		if (error instanceof AdminApiError) return { ok: false, error: error.message };
		return { ok: false, error: "Nie udało się zapisać ustawień." };
	}

	await revalidateContentCache(["/"]);
	return { ok: true, error: null };
}

export type RedeployContentState = {
	ok: boolean;
	error: string | null;
	/** Deploy hook wysłany — sync obrazów w prebuild (~2–3 min). */
	queued: boolean;
};

/** Ręczny redeploy storefrontu (sync obrazów CMS → `/public/images/cms/`). */
export async function triggerCmsRedeployAction(): Promise<RedeployContentState> {
	try {
		await requireAdminSession();
	} catch (error) {
		if (error instanceof AdminUnauthorizedError) redirect(`${getModulyConfig().basePath}/login`);
		return { ok: false, error: "Brak sesji administratora.", queued: false };
	}

	const hookConfigured = Boolean(process.env.VERCEL_DEPLOY_HOOK_URL?.trim());
	const queued = await triggerCmsRedeploy("CMS manual redeploy (panel)");
	if (!queued) {
		return {
			ok: false,
			error: hookConfigured
				? "Nie udało się uruchomić redeploy na Vercel. Spróbuj ponownie za chwilę."
				: "Deploy hook nie jest skonfigurowany (VERCEL_DEPLOY_HOOK_URL).",
			queued: false,
		};
	}

	return { ok: true, error: null, queued: true };
}

export type UploadState = { urls: string[]; error: string | null };

export async function uploadImagesAction(formData: FormData): Promise<UploadState> {
	const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
	if (files.length === 0) return { urls: [], error: "Nie wybrano plików." };

	try {
		await requireAdminSession();
		const { adminUpload, resolveMedusaMediaUrls, uploadCmsAssetFile } = await import(
			"@moduly/magazyn-core"
		);
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
