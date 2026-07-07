export { POST } from "@moduly/magazyn-core/api/cms-upload";

// Next/Turbopack wymaga literalow w pliku trasy - re-eksport runtime/
// maxDuration z pakietu wywala build ("mustn't be reexported").
// Wartosci MUSZA byc rowne tym w @moduly/magazyn-core/api/cms-upload.
export const runtime = "nodejs";
export const maxDuration = 120;
