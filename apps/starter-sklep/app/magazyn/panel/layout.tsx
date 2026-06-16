import type { ReactNode } from "react";
import { requireAdminSession } from "@moduly/magazyn-core";
import { PanelShell } from "@moduly/ui";
import { logoutAction } from "@/components/auth/actions";
import { getPanelConfig } from "@/lib/panel-config";

export const maxDuration = 120;

export default async function PanelLayout({ children }: { children: ReactNode }) {
	await requireAdminSession();

	return (
		<PanelShell config={getPanelConfig()} logoutAction={logoutAction}>
			{children}
		</PanelShell>
	);
}
