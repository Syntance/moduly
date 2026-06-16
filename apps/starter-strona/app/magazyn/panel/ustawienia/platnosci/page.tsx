import { CreditCard } from "lucide-react";
import { PageHeader, SettingsSectionView, settingsPlatnosci } from "@moduly/ui";

export const dynamic = "force-dynamic";

export default function SettingsPlatnosciPage() {
	return (
		<div className="flex flex-col gap-6">
			<PageHeader title="Płatności" description="Aktywne metody płatności i limity." />
			<SettingsSectionView icon={CreditCard} data={settingsPlatnosci} />
		</div>
	);
}
