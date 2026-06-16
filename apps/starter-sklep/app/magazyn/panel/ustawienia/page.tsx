import { redirect } from "next/navigation";
import { modulyConfig } from "@/moduly.config";

export const dynamic = "force-dynamic";

export default function SettingsOverviewPage() {
	redirect(`${modulyConfig.basePath}/panel/ustawienia/ogolne`);
}
