import type { ReactNode } from "react";
import { requireAdminSession } from "@moduly/magazyn-core";
import { ExtendedPanelShell } from "@/components/panel/extended-panel-shell";
import { logoutAction } from "@/components/auth/actions";
import { getPanelConfig } from "@/lib/panel-config";

export const maxDuration = 120;

export default async function PanelLayout({ children }: { children: ReactNode }) {
	await requireAdminSession();

	return (
		<ExtendedPanelShell config={getPanelConfig()} logoutAction={logoutAction}>
			{children}
		</ExtendedPanelShell>
	);
}
