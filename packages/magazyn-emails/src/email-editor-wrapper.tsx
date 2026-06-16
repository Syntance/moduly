"use client";

import dynamic from "next/dynamic";
import type { EmailTemplate, EmailTemplateType } from "./template-types";

const EmailEditorDynamic = dynamic(
	() => import("./email-editor").then((m) => ({ default: m.EmailEditor })),
	{
		ssr: false,
		loading: () => (
			<div className="flex h-[400px] items-center justify-center text-muted-foreground">
				Ładowanie edytora...
			</div>
		),
	},
);

export function EmailEditorWrapper({
	initialTemplates,
	initialType,
	hideTemplatePicker,
}: {
	initialTemplates: EmailTemplate[];
	initialType?: EmailTemplateType;
	hideTemplatePicker?: boolean;
}) {
	return (
		<EmailEditorDynamic
			initialTemplates={initialTemplates}
			initialType={initialType}
			hideTemplatePicker={hideTemplatePicker}
		/>
	);
}
