import type { DataStore } from "@moduly/types";

let dataStoreInstance: DataStore | null = null;

/** Rejestruje implementację DataStore (Medusa, Postgres, pliki JSON). */
export function setDataStore(store: DataStore): void {
	dataStoreInstance = store;
}

export function getDataStore(): DataStore | null {
	return dataStoreInstance;
}

export function requireDataStore(): DataStore {
	if (!dataStoreInstance) {
		throw new Error(
			"[moduly/data-store] Brak zarejestrowanego DataStore — wywołaj setDataStore() przy starcie aplikacji.",
		);
	}
	return dataStoreInstance;
}
