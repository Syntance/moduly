import { Key } from "lucide-react";
import { PageHeader, SettingsSectionView, settingsApi } from "@moduly/ui";

export const dynamic = "force-dynamic";

export default function SettingsApiPage() {
	return (
		<div className="flex flex-col gap-6">
			<PageHeader title="API & Webhooks" description="Klucze integracji i endpointy zdarzeń." />
			<SettingsSectionView icon={Key} data={settingsApi} />
		</div>
	);
}
