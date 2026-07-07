import { getConfiguredMedusaBackendUrl } from "./resolve-backend-url";

/**
 * Baza URL do Store API Medusy w `fetch()` i w JS SDK.
 *
 * Przeglądarka: zawsze same-origin `/api/medusa` (proxy). Dzięki temu nie
 * uderzamy w CORS (origin `http://localhost:3335` albo podgląd Vercel preview
 * nie są na białej liście Railway → `TypeError: Failed to fetch`).
 *
 * Serwer (RSC / Server Actions / /api/medusa handler): bezpośrednio do
 * Medusy z env. Tu nie ma CORS, a mamy pełną kontrolę nad timeoutem.
 *
 * Jeśli kiedyś będziemy chcieli omijać proxy w przeglądarce (np. żeby uciec
 * od limitu czasu Vercel functions na `completeCart`), zrobimy to osobną
 * flagą `NEXT_PUBLIC_MEDUSA_DIRECT=true` i z odpowiednim `STORE_CORS`
 * skonfigurowanym dla tej konkretnej domeny.
 */
export function resolveMedusaFetchBase(): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/medusa`;
  }

  return getConfiguredMedusaBackendUrl();
}
