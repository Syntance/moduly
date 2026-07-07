/**
 * Unikalny „odcisk” konfiguracji pozycji (kolory, teksty, linki, podstawka).
 * Ten sam wariant + ten sam odcisk → zwiększamy ilość; inny odcisk → osobna pozycja.
 */
export function cartLineConfigFingerprint(
  metadata: Record<string, string> | undefined,
): string {
  if (!metadata || Object.keys(metadata).length === 0) return "";
  const parts: string[] = [];
  for (const key of Object.keys(metadata).sort()) {
    /* `_hex` pochodzi z nazwy palety — nie wpływa na „konfigurację” vs merge. */
    if (key.endsWith("_hex")) continue;
    if (key.startsWith("color_")) {
      parts.push(`${key}=${metadata[key]}`);
      continue;
    }
    if (
      key.startsWith("text_") ||
      key.startsWith("link_") ||
      key.startsWith("file_")
    ) {
      parts.push(`${key}=${metadata[key]}`);
      continue;
    }
    if (
      key === "certificate_stand" ||
      key === "mat_finish" ||
      key === "custom_text" ||
      key === "custom_color"
    ) {
      parts.push(`${key}=${metadata[key]}`);
    }
  }
  return parts.join("|");
}
