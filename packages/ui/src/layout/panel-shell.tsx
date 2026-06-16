import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { PanelSidebarNav } from "./panel-sidebar-nav";
import type { PanelConfig } from "./types";

export type PanelShellProps = {
	children: ReactNode;
	config: PanelConfig;
	/** Opcjonalne nadpisanie CSS variables (np. motyw panelu z metadanych sklepu). */
	style?: CSSProperties;
	/** Server Action wylogowania — przekaż z warstwy auth aplikacji. */
	logoutAction?: () => void | Promise<void>;
};

/**
 * Powłoka panelu: sidebar (branding + nawigacja + wyloguj) i obszar treści.
 *
 * Autoryzacja i redirect przy braku sesji — odpowiedzialność layoutu aplikacji
 * (np. `requireAdminSession()` przed renderem).
 *
 * Użyj w `app{basePath}/(panel)/layout.tsx`:
 * ```tsx
 * export default function Layout({ children }) {
 *   return <PanelShell config={panelConfig}>{children}</PanelShell>;
 * }
 * ```
 */
export function PanelShell({ children, config, style, logoutAction }: PanelShellProps) {
	const { basePath, branding } = config;

	return (
		<div
			data-moduly-panel
			className="fixed inset-0 w-full overflow-y-auto bg-background text-foreground"
			style={style}
		>
			<div className="mx-auto flex min-h-full w-full max-w-7xl flex-col lg:flex-row">
				<aside className="flex shrink-0 flex-col gap-6 border-b border-border p-5 lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:border-r lg:border-b-0">
					<Link href={`${basePath}/panel`} className="block shrink-0">
						<p className="text-[0.65rem] font-medium tracking-[0.25em] text-muted-foreground uppercase">
							{branding.name}
						</p>
						<p className="font-serif text-lg text-foreground">{branding.panelTitle}</p>
					</Link>

					<PanelSidebarNav config={config} logoutAction={logoutAction} />
				</aside>

				<main className="min-w-0 flex-1 p-5 lg:p-8">{children}</main>
			</div>
		</div>
	);
}
