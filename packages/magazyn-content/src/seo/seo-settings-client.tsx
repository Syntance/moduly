"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@moduly/ui";
import { getModulyConfig } from "@moduly/magazyn-core/config";
import type { ContentPageConfig } from "@moduly/config";
import type { PageSeoMap, SiteSettings } from "@moduly/types";
import { SeoForm } from "./seo-form";
import { CmsRedeployButton } from "../cms-redeploy-button";

type Props = {
	siteSettings: SiteSettings;
	pageSeo: PageSeoMap;
	pages: ContentPageConfig[];
	activeTab: "global" | string;
};

const BASE = `${getModulyConfig().basePath}/panel/ustawienia/seo`;

export function SeoSettingsClient({ siteSettings, pageSeo, pages, activeTab }: Props) {
	const pathname = usePathname();

	return (
		<div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
			<nav aria-label="Zakładki SEO" className="flex shrink-0 flex-row flex-wrap gap-1 lg:w-52 lg:flex-col">
				<SeoTab href={BASE} label="Globalne" active={pathname === BASE} />
				{pages.map((page) => (
					<SeoTab
						key={page.id}
						href={`${BASE}/${page.id}`}
						label={page.label}
						active={pathname === `${BASE}/${page.id}`}
					/>
				))}
			</nav>

			<div className="min-w-0 flex-1 flex flex-col gap-4">
				<CmsRedeployButton />
				{activeTab === "global" ? (
					<SeoForm mode="global" initial={siteSettings} />
				) : (
					(() => {
						const page = pages.find((p) => p.id === activeTab);
						if (!page) return null;
						return (
							<SeoForm
								mode="page"
								pageId={page.id}
								path={page.path}
								initial={pageSeo[page.id]}
							/>
						);
					})()
				)}
			</div>
		</div>
	);
}

function SeoTab({ href, label, active }: { href: string; label: string; active: boolean }) {
	return (
		<Link
			href={href}
			aria-current={active ? "page" : undefined}
			className={cn(
				"rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
				active
					? "bg-primary text-primary-foreground"
					: "text-muted-foreground hover:bg-muted hover:text-foreground",
			)}
		>
			{label}
		</Link>
	);
}
