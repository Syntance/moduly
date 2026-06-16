import { Bell } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { SettingsSectionView } from "@/components/settings/settings-section-view";
import { settingsPowiadomienia } from "@/lib/settings-data";

export default function UstawieniaPowiadomieniaPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Powiadomienia" description="Alerty e-mail i push dla zespołu." />
      <SettingsSectionView icon={Bell} data={settingsPowiadomienia} />
    </div>
  );
}
