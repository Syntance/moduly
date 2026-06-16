import { Bell } from "lucide-react";
import { PageHeader, SettingsSectionView, settingsPowiadomienia } from "@moduly/ui";

export const dynamic = "force-dynamic";

export default function SettingsPowiadomieniaPage() {
	return (
		<div className="flex flex-col gap-6">
			<PageHeader title="Powiadomienia" description="Alerty e-mail i push dla zespołu." />
			<SettingsSectionView icon={Bell} data={settingsPowiadomienia} />
		</div>
	);
}
