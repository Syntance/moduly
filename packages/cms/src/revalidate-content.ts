import { revalidatePath, revalidateTag } from "next/cache";
import { MODULY_CONTENT_CACHE_TAG } from "./metadata-keys";

export type RevalidateContentResult = {
	live: true;
};

/**
 * Rewalidacja CMS po zapisie — cache tag `moduly-content`.
 * Obrazy wymagają prebuild sync + redeploy.
 */
export function revalidateContentCache(
	paths: string[] = [],
): RevalidateContentResult {
	revalidateTag(MODULY_CONTENT_CACHE_TAG, "max");
	revalidateTag("site-settings", "max");
	for (const path of paths) {
		if (path) revalidatePath(path);
	}

	return { live: true };
}
