import { FileText } from "lucide-react";
import { getMagazynFormsConfig, requireFormsAdmin } from "./configure";
import { FormsSubnav } from "./forms-subnav";
import { listContactSubmissions } from "./lib/submissions-store";
import { SubmissionsList } from "./submissions-list";

export const dynamic = "force-dynamic";

export default async function FormularzeOtrzymanePage() {
	await requireFormsAdmin();
	const cfg = getMagazynFormsConfig();
	const submissions = await listContactSubmissions();
	const nowe = submissions.length;

	return (
		<div className="flex flex-col gap-6">
			<header>
				<h1 className="flex items-center gap-2 font-serif text-2xl text-foreground">
					<FileText className="size-6 text-primary" aria-hidden />
					Formularze
				</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Otrzymane zgłoszenia ze sklepu · {nowe} łącznie
				</p>
			</header>

			<FormsSubnav basePath={cfg.basePath} />
			<SubmissionsList submissions={submissions} />
		</div>
	);
}
