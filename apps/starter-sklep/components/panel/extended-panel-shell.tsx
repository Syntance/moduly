import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import type { PanelConfig } from "@moduly/ui";
import { ExtendedPanelSidebar } from "./extended-sidebar-nav";

type Props = {
	children: ReactNode;
	config: PanelConfig;
	style?: CSSProperties;
	logoutAction?: () => void | Promise<void>;
};

/** Powłoka panelu z rozszerzoną nawigacją (formularze, zwroty). */
export function ExtendedPanelShell({ children, config, style, logoutAction }: Props) {
	const { basePath, branding } = config;

	return (
		<div
			data-moduly-panel
			className="fixed inset-0 w-full overflow-y-auto bg-background text-foreground"
			style={style}
		>
			<div className="mx-auto flex min-h-full w-full max-w-7xl flex-col lg:flex-row">
				<aside className="flex shrink-0 flex-col gap-6 border-b border-border p-5 lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:border-r lg:border-b-0">
					<Link href={`${basePath}/panel`} className="block">
						<p className="text-[0.65rem] font-medium tracking-[0.25em] text-muted-foreground uppercase">
							{branding.name}
						</p>
						<p className="font-serif text-lg text-foreground">{branding.panelTitle}</p>
					</Link>
					<ExtendedPanelSidebar config={config} logoutAction={logoutAction} />
				</aside>
				<main className="min-w-0 flex-1 p-5 lg:p-8">{children}</main>
			</div>
		</div>
	);
}
