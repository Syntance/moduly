import { Truck } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { SettingsSectionView } from "@/components/settings/settings-section-view";
import { settingsDostawa } from "@/lib/settings-data";

export default function UstawieniaDostawaPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Dostawa" description="Metody dostawy, strefy i ceny." />
      <SettingsSectionView icon={Truck} data={settingsDostawa} />
    </div>
  );
}
