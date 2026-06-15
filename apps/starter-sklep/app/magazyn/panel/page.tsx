import { OverviewPage } from "@moduly/ui";
import { getPanelConfig } from "@/lib/panel-config";

export default function PanelOverviewPage() {
	return <OverviewPage config={getPanelConfig()} />;
}
