import { CreditCard } from "lucide-react";
import { PageHeader } from "@/components/ui";
import { SettingsSectionView } from "@/components/settings/settings-section-view";
import { settingsPlatnosci } from "@/lib/settings-data";

export default function UstawieniaPlatnosciPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Płatności" description="Aktywne metody płatności i limity." />
      <SettingsSectionView icon={CreditCard} data={settingsPlatnosci} />
    </div>
  );
}
