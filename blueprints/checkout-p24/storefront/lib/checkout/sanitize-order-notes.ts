/** Maks. długość uwag do zamówienia — spójna z backendem (order-notes.ts). */
export const ORDER_NOTES_MAX_LENGTH = 500;

/**
 * Uwagi do zamówienia jako czysty tekst — usuwa cały HTML (XSS w panelu
 * magazynu / mailach). Świadomie BEZ `isomorphic-dompurify`: ten ciągnie jsdom,
 * a na Vercel/Next 16 z Turbopackiem jego synchroniczny `require()` ESM-only
 * `@exodus/bytes` wywala SSR `/checkout` (ERR_REQUIRE_ESM). Backend i tak
 * re-sanityzuje tę samą logiką — to pierwsza linia obrony.
 */
export function sanitizeOrderNotes(raw: string | undefined | null): string {
  if (!raw) return "";
  return raw
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, ORDER_NOTES_MAX_LENGTH);
}
