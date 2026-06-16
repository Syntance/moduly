import { Globe } from "lucide-react";
import { PageHeader, SettingsSectionView, settingsOgolne } from "@moduly/ui";

export const dynamic = "force-dynamic";

export default function SettingsOgolnePage() {
	return (
		<div className="flex flex-col gap-6">
			<PageHeader
				title="Ustawienia sklepu"
				description="Konfiguracja sklepu, integracje i bezpieczeństwo."
			/>
			<SettingsSectionView icon={Globe} data={settingsOgolne} />
		</div>
	);
}
