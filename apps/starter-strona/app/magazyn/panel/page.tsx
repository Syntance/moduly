import { OverviewPage } from "@moduly/ui";
import { toPanelConfig } from "@/lib/panel-config";

export default function PanelOverviewPage() {
  return <OverviewPage config={toPanelConfig()} />;
}
