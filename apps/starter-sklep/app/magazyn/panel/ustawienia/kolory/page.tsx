import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Kolory usunięte z menu ustawień — przekierowanie na Ogólne. */
export default function KoloryRedirectPage() {
	redirect("/magazyn/panel/ustawienia/ogolne");
}
