import { Shield } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { SettingsSectionView } from "@/components/settings/settings-section-view";
import { settingsBezpieczenstwo } from "@/lib/settings-data";

export default function UstawieniaBezpieczenstwoPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Bezpieczeństwo" description="Sesje, 2FA i dostęp do panelu." />
      <SettingsSectionView icon={Shield} data={settingsBezpieczenstwo} />
    </div>
  );
}
