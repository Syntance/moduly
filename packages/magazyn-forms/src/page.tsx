import { FileText } from "lucide-react";
import Link from "next/link";
import { getMagazynFormsConfig, requireFormsAdmin } from "./configure";
import { FormsSubnav } from "./forms-subnav";
import { FormsManager } from "./forms-manager";
import { getContactFormsConfig } from "./store";

export default async function FormularzePage() {
	await requireFormsAdmin();
	const cfg = getMagazynFormsConfig();
	const config = await getContactFormsConfig();
	const mailsHref = `${cfg.basePath}/panel/maile`;

	return (
		<div className="flex flex-col gap-6">
			<header className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<h1 className="flex items-center gap-2 font-serif text-2xl text-foreground">
						<FileText className="size-6 text-primary" aria-hidden />
						Formularze
					</h1>
					<p className="mt-1 max-w-2xl text-sm text-muted-foreground">
						Formularze kontaktowe na podstronach sklepu: tematy, odbiorcy zespołu i
						mapowanie ścieżek. Potwierdzenie dla klienta — jeden szablon w{" "}
						<Link href={mailsHref} className="text-primary underline underline-offset-4">
							E-maile → Formularze
						</Link>
						.
					</p>
				</div>
			</header>

			<FormsSubnav basePath={cfg.basePath} />
			<FormsManager initialConfig={config} mailsHref={mailsHref} />
		</div>
	);
}
