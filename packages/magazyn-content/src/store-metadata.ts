import "server-only";
import { adminFetch } from "@moduly/magazyn-core";

type MedusaStore = { id: string; metadata?: Record<string, unknown> | null };

export async function getMedusaStore(): Promise<MedusaStore> {
	const data = await adminFetch<{ stores: MedusaStore[] }>(
		"/admin/stores?limit=1&fields=id,metadata",
	);
	const store = data.stores[0];
	if (!store) throw new Error("Nie znaleziono sklepu w Medusa.");
	return store;
}

export async function mergeStoreMetadata(
	patch: Record<string, string | undefined>,
): Promise<void> {
	const store = await getMedusaStore();
	const nextMetadata = { ...(store.metadata ?? {}) } as Record<string, unknown>;

	for (const [key, value] of Object.entries(patch)) {
		if (value === undefined) {
			delete nextMetadata[key];
		} else {
			nextMetadata[key] = value;
		}
	}

	await adminFetch(`/admin/stores/${store.id}`, {
		method: "POST",
		body: JSON.stringify({ metadata: nextMetadata }),
	});
}

export function readMetadataJson(store: MedusaStore, key: string): unknown {
	return store.metadata?.[key];
}
