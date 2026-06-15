"use client";

import { usePathname } from "next/navigation";
import { SidebarFooter } from "./sidebar-footer";
import { SidebarNav } from "./sidebar-nav";
import { SettingsSidebarNav } from "./settings-sidebar-nav";
import { isSettingsPath } from "./settings-nav-items";
import type { PanelConfig } from "./types";

export type PanelSidebarNavProps = {
	config: PanelConfig;
	/** Server Action wylogowania — przekaż z warstwy auth aplikacji. */
	logoutAction?: () => void | Promise<void>;
};

export function PanelSidebarNav({ config, logoutAction }: PanelSidebarNavProps) {
	const pathname = usePathname();

	return (
		<div className="flex flex-col">
			{isSettingsPath(pathname, config.basePath) ? (
				<SettingsSidebarNav config={config} />
			) : (
				<SidebarNav config={config} />
			)}
			<SidebarFooter storefrontUrl={config.branding.storefrontUrl} logoutAction={logoutAction} />
		</div>
	);
}
