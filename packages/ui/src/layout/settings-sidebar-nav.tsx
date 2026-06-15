"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "../lib/cn";
import { buildSettingsNavItems } from "./settings-nav-items";
import type { PanelConfig } from "./types";

export type SettingsSidebarNavProps = {
	config: Pick<PanelConfig, "basePath">;
};

export function SettingsSidebarNav({ config }: SettingsSidebarNavProps) {
	const pathname = usePathname();
	const items = buildSettingsNavItems(config.basePath);
	const panelHome = `${config.basePath}/panel`;

	return (
		<div className="flex flex-col gap-4">
			<Link
				href={panelHome}
				className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
			>
				<ArrowLeft className="size-4 shrink-0" aria-hidden />
				Powrót
			</Link>

			<div className="flex flex-col gap-1">
				<p className="px-3 text-[0.65rem] font-medium tracking-[0.2em] text-muted-foreground uppercase">
					Ustawienia
				</p>
				<nav aria-label="Ustawienia sklepu" className="flex flex-col gap-1">
					{items.map(({ href, label, icon: Icon }) => {
						const active = pathname === href || pathname.startsWith(`${href}/`);
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
								<Icon className="size-4 shrink-0" aria-hidden />
								{label}
							</Link>
						);
					})}
				</nav>
			</div>
		</div>
	);
}
