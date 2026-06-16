import { Globe } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { SettingsSectionView } from "@/components/settings/settings-section-view";
import { settingsOgolne } from "@/lib/settings-data";

export default function UstawieniaOgolnePage() {
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
