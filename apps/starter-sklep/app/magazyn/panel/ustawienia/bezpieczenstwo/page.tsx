import { Shield } from "lucide-react";
import { PageHeader, SettingsSectionView, settingsBezpieczenstwo } from "@moduly/ui";

export const dynamic = "force-dynamic";

export default function SettingsBezpieczenstwoPage() {
	return (
		<div className="flex flex-col gap-6">
			<PageHeader title="Bezpieczeństwo" description="Sesje, 2FA i dostęp do panelu." />
			<SettingsSectionView icon={Shield} data={settingsBezpieczenstwo} />
		</div>
	);
}
