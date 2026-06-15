import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";
import { revalidateStorefrontMedusaCache } from "@moduly/magazyn-core";
import { triggerVercelDeploy } from "@moduly/magazyn-core";
import { MODULY_CONTENT_CACHE_TAG } from "@moduly/cms/metadata-keys";

export type RevalidateContentResult = {
	/** Tekst/SEO odświeżone tagiem (live na prod w sekundach). */
	live: true;
};

/**
 * Rewalidacja CMS po zapisie — tylko cache (tekst live).
 * Obrazy: ręczny redeploy z panelu (`triggerCmsRedeploy`).
 */
export async function revalidateContentCache(
	paths: string[] = [],
): Promise<RevalidateContentResult> {
	revalidateTag(MODULY_CONTENT_CACHE_TAG, "max");
	revalidateTag("site-settings", "max");
	await revalidateStorefrontMedusaCache([MODULY_CONTENT_CACHE_TAG, "site-settings"]);
	for (const path of paths) {
		if (path) revalidatePath(path);
	}

	return { live: true };
}

/** Ręczny redeploy → prebuild sync obrazów CMS do `/public/images/cms/`. */
export async function triggerCmsRedeploy(reason = "CMS manual redeploy"): Promise<boolean> {
	return triggerVercelDeploy(reason);
}
