"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, PackageX } from "lucide-react";
import { buildNavItems, cn, SidebarFooter, SidebarNav } from "@moduly/ui";
import { SettingsSidebarNav, isSettingsPath } from "@moduly/ui";
import type { PanelConfig } from "@moduly/ui";
import { modulyConfig } from "@/moduly.config";

type Props = {
	config: PanelConfig;
	logoutAction?: () => void | Promise<void>;
};

/** Sidebar z dodatkowymi modułami formularze + zwroty (poza @moduly/ui nav-items). */
export function ExtendedPanelSidebar({ config, logoutAction }: Props) {
	const pathname = usePathname();
	const modules = modulyConfig.modules;
	const base = config.basePath;

	const extraItems = [
		modules.forms
			? { href: `${base}/panel/formularze`, label: "Formularze", segment: "formularze" }
			: null,
		modules.returns
			? { href: `${base}/panel/zwroty`, label: "Zwroty", segment: "zwroty" }
			: null,
	].filter(Boolean) as Array<{ href: string; label: string; segment: string }>;

	return (
		<div className="flex flex-col">
			{isSettingsPath(pathname, config.basePath) ? (
				<SettingsSidebarNav config={config} />
			) : (
				<>
					<SidebarNav config={config} />
					{extraItems.length > 0 ? (
						<nav aria-label="Moduły rozszerzone" className="mt-4 flex flex-col gap-1 border-t border-border pt-4">
							{extraItems.map(({ href, label, segment }) => {
								const active = pathname.startsWith(href);
								const Icon = segment === "formularze" ? FileText : PackageX;
								return (
									<Link
										key={href}
										href={href}
										aria-current={active ? "page" : undefined}
										className={cn(
											"flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
											active
												? "bg-primary text-primary-foreground"
												: "text-muted-foreground hover:bg-muted hover:text-foreground",
										)}
									>
										<Icon className="size-4" aria-hidden />
										{label}
									</Link>
								);
							})}
						</nav>
					) : null}
				</>
			)}
			<SidebarFooter storefrontUrl={config.branding.storefrontUrl} logoutAction={logoutAction} />
		</div>
	);
}

/** Eksport pomocniczy — lista wszystkich segmentów panelu. */
export function allPanelNavItems(config: PanelConfig) {
	return buildNavItems(config);
}
