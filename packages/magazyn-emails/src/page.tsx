import { loadAdmin } from "@moduly/magazyn-core";
import { getAllEmailTemplates } from "./store";
import { EmailEditorWrapper } from "./email-editor-wrapper";

/**
 * Strona edytora maili. Skopiuj/re-eksportuj w `app{basePath}/(panel)/maile/page.tsx`:
 *
 *   export { default, dynamic } from "@magazyn/modules/emails/page";
 */
export const dynamic = "force-dynamic";

export default async function MailePage() {
	const templates = await loadAdmin(getAllEmailTemplates);

	return (
		<div className="flex flex-col gap-6">
			<header>
				<h1 className="font-serif text-2xl text-foreground">E-maile</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Wizualny edytor e-maili transakcyjnych: statusy zamówień oraz potwierdzenia formularza
					kontaktowego. Suwak przy szablonie włącza lub wyłącza automatyczną wysyłkę danego etapu.
					Zapisana treść nadpisuje domyślny e-mail z kodu.
				</p>
			</header>

			<EmailEditorWrapper initialTemplates={templates} />
		</div>
	);
}
