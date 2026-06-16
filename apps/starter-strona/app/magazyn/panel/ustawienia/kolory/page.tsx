import { redirect } from "next/navigation";
import { getModulyConfig } from "@moduly/magazyn-core/config";

export const dynamic = "force-dynamic";

/** Kolory usunięte z menu ustawień — przekierowanie na Ogólne. */
export default function KoloryRedirectPage() {
	redirect(`${getModulyConfig().basePath}/panel/ustawienia/ogolne`);
}
