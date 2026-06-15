"use client";

import dynamic from "next/dynamic";
import type { EmailTemplate } from "./template-types";

/**
 * Client Component wrapper dla EmailEditor z wyłączonym SSR.
 * 
 * @dnd-kit generuje różne aria-describedby ID na serwerze i kliencie → hydration mismatch.
 * Wyłączamy SSR, żeby render był tylko po stronie klienta.
 */
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

export function EmailEditorWrapper({ initialTemplates }: { initialTemplates: EmailTemplate[] }) {
	return <EmailEditorDynamic initialTemplates={initialTemplates} />;
}
