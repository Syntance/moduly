export const dynamic = "force-dynamic";

export default function GlobalColorsSettingsPage() {
	return (
		<div className="flex flex-col gap-4">
			<h1 className="font-serif text-2xl text-foreground">Kolory globalne</h1>
			<p className="text-sm text-muted-foreground">
				Zarządzanie globalną paletą kolorów produktów — moduł dostępny po podłączeniu konfiguratora
				w projekcie docelowym.
			</p>
		</div>
	);
}
