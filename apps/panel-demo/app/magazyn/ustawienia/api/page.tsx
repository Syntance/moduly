import { Key } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { SettingsSectionView } from "@/components/settings/settings-section-view";
import { settingsApi } from "@/lib/settings-data";

export default function UstawieniaApiPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="API & Webhooks" description="Klucze integracji i endpointy zdarzeń." />
      <SettingsSectionView icon={Key} data={settingsApi} />
    </div>
  );
}
