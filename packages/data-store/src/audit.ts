import type { AuditEntry, DataStore } from "@moduly/types";

type AuditInput = Omit<AuditEntry, "createdAt"> & {
	createdAt?: string;
};

/**
 * Zapisuje wpis audytu przez `DataStore`.
 * Używaj w Server Actions po udanej mutacji.
 */
export async function recordAudit(
	store: DataStore,
	entry: AuditInput,
): Promise<void> {
	await store.recordAudit({
		...entry,
		createdAt: entry.createdAt ?? new Date().toISOString(),
	});
}
