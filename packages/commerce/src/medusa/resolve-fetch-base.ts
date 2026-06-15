import { getConfiguredMedusaBackendUrl } from "./resolve-backend-url";

/**
 * Baza URL do Store API Medusy w `fetch()` i w JS SDK.
 *
 * Przeglądarka: same-origin `/api/medusa` (proxy). Serwer: bezpośrednio z env.
 */
export function resolveMedusaFetchBase(): string {
	if (typeof window !== "undefined") {
		return `${window.location.origin}/api/medusa`;
	}

	return getConfiguredMedusaBackendUrl();
}
