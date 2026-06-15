import "server-only";
import { cache } from "react";
import {
	assembleMetadataBlobFromDataStore,
	fetchMedusaMetadataBlob,
	getDataStore,
	type RawStoreMetadataBlob,
} from "@moduly/data-store";
import { MODULY_CONTENT_CACHE_TAG } from "./metadata-keys";

export type { RawStoreMetadataBlob };

const REVALIDATE_SECONDS = 3600;

/**
 * Jeden odczyt Store.metadata / DataStore dla storefrontu.
 * Dedup w ramach renderu (`cache`) + ISR (3600s) dla Medusa.
 * Przy niepowodzeniu zwraca null — defaults mają lokalne copy.
 */
export const fetchStoreMetadataBlob = cache(async (): Promise<RawStoreMetadataBlob | null> => {
	const dataStore = getDataStore();
	if (dataStore) {
		try {
			const pageIds =
				process.env.MODULY_CMS_PAGE_IDS?.split(",")
					.map((id) => id.trim())
					.filter(Boolean) ?? ["home", "shop"];
			return await assembleMetadataBlobFromDataStore(dataStore, pageIds);
		} catch (error) {
			console.error("[moduly/cms] Odczyt DataStore nie powiódł się:", error);
			return null;
		}
	}

	return fetchMedusaMetadataBlob({
		cacheTag: MODULY_CONTENT_CACHE_TAG,
		revalidateSeconds: REVALIDATE_SECONDS,
	});
});
