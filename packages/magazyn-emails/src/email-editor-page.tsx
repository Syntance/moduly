import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { loadAdmin } from "@moduly/magazyn-core";
import { getModulyConfig } from "@moduly/magazyn-core/config";
import { getAllEmailTemplates } from "./store";
import { EmailEditorWrapper } from "./email-editor-wrapper";
import type { EmailTemplateType } from "./template-types";
import { EMAIL_TEMPLATE_TYPES } from "./template-types";

export const dynamic = "force-dynamic";

type Props = {
	params: Promise<{ type: string }>;
};

export function generateStaticParams() {
	return EMAIL_TEMPLATE_TYPES.map(({ type }) => ({ type }));
}

export default async function EmailEditorPage({ params }: Props) {
	const { type } = await params;
	const isValid = EMAIL_TEMPLATE_TYPES.some((entry) => entry.type === type);
	if (!isValid) notFound();

	const templateType = type as EmailTemplateType;
	const templates = await loadAdmin(getAllEmailTemplates);
	const basePath = getModulyConfig().basePath;

	const meta = EMAIL_TEMPLATE_TYPES.find((entry) => entry.type === templateType);

	return (
		<div className="flex flex-col gap-6">
			<Link
				href={`${basePath}/panel/maile`}
				className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
			>
				<ChevronLeft className="size-4" aria-hidden />
				Wróć do e-maili
			</Link>

			<header>
				<h1 className="font-serif text-2xl text-foreground">{meta?.label ?? "E-mail"}</h1>
				<p className="mt-1 font-mono text-sm text-muted-foreground">{templateType}</p>
			</header>

			<EmailEditorWrapper initialTemplates={templates} initialType={templateType} hideTemplatePicker />
		</div>
	);
}
