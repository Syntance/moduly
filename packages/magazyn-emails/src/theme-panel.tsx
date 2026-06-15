"use client";

import type { EmailTheme } from "./template-types";
import { FONT_OPTIONS } from "./email-fonts";
import { ColorField, NumberField, SelectField, TextField } from "./fields";

export function ThemePanel({
	theme,
	onChange,
}: {
	theme: EmailTheme;
	onChange: (next: EmailTheme) => void;
}) {
	const patch = (p: Partial<EmailTheme>) => { onChange({ ...theme, ...p }); };
	return (
		<div className="flex flex-col gap-4">
			<div className="border-b border-border pb-3">
				<h3 className="font-serif text-base text-foreground">Motyw maila</h3>
				<p className="text-xs text-muted-foreground">Globalne kolory i układ. Czcionkę treści ustawiasz per blok.</p>
			</div>

			<TextField label="Nazwa marki (nagłówek)" value={theme.brandName} onChange={(brandName) => { patch({ brandName }); }} />

			<SelectField
				label="Czcionka nagłówka marki"
				value={theme.headerFontKey ?? theme.fontKey}
				options={FONT_OPTIONS}
				onChange={(headerFontKey) => { patch({ headerFontKey }); }}
			/>

			<TextField
				label="Tekst nad marką (opcjonalny)"
				value={theme.headerEyebrow ?? ""}
				placeholder="np. Potwierdzenie zamówienia"
				onChange={(headerEyebrow) => { patch({ headerEyebrow }); }}
			/>

			<div className="grid grid-cols-2 gap-3">
				<NumberField label="Szerokość (px)" value={theme.contentWidth} min={320} max={800} step={10} onChange={(contentWidth) => { patch({ contentWidth }); }} />
				<NumberField label="Zaokrąglenie (px)" value={theme.radius} min={0} max={48} onChange={(radius) => { patch({ radius }); }} />
			</div>

			<div className="grid grid-cols-2 gap-3">
				<ColorField label="Tło strony" value={theme.bg} onChange={(bg) => { patch({ bg }); }} />
				<ColorField label="Tło treści" value={theme.contentBg} onChange={(contentBg) => { patch({ contentBg }); }} />
				<ColorField label="Tekst" value={theme.text} onChange={(text) => { patch({ text }); }} />
				<ColorField label="Nagłówki" value={theme.heading} onChange={(heading) => { patch({ heading }); }} />
				<ColorField label="Akcent / przyciski" value={theme.accent} onChange={(accent) => { patch({ accent }); }} />
				<ColorField label="Tekst drugorzędny" value={theme.muted} onChange={(muted) => { patch({ muted }); }} />
				<ColorField label="Linki" value={theme.link} onChange={(link) => { patch({ link }); }} />
				<ColorField label="Tło nagłówka" value={theme.headerBg} onChange={(headerBg) => { patch({ headerBg }); }} />
				<ColorField label="Tekst nagłówka" value={theme.headerText} onChange={(headerText) => { patch({ headerText }); }} />
			</div>
		</div>
	);
}
