import { Truck } from "lucide-react";
import { PageHeader, SettingsSectionView, settingsDostawa } from "@moduly/ui";

export const dynamic = "force-dynamic";

export default function SettingsDostawaPage() {
	return (
		<div className="flex flex-col gap-6">
			<PageHeader title="Dostawa" description="Metody dostawy, strefy i ceny." />
			<SettingsSectionView icon={Truck} data={settingsDostawa} />
		</div>
	);
}
