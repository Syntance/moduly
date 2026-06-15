/**
 * Wspólne zaokrąglenia edytora — zgodne z Button (rounded-lg) i paletą bloków.
 * Przełączniki segmentowe: track rounded-lg, aktywna pigułka rounded-md (track − padding).
 * Próbka koloru: wewnętrzny radius = lg − inset − border (email-editor.css).
 */
export const editorBtnRounded = "rounded-lg";

/** Ramka grupy przełączników (Blok/Motyw, desktop/mobile, wyrównanie). */
export const segmentTrack = "inline-flex rounded-lg border border-input p-0.5";

/** Przycisk wewnątrz grupy — podświetlenie aktywnego dopasowane do obramowania tracku. */
export const segmentItem =
	"rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

export const segmentItemActive = "bg-primary text-primary-foreground";
export const segmentItemIdle = "text-muted-foreground hover:bg-muted";

/** Klasa input[type=color] — wymaga email-editor.css (zaokrąglona próbka w środku). */
export const colorSwatchInput = "email-editor-color-swatch h-9 w-10";
