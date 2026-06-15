"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@moduly/ui";
import { getModulyConfig } from "@moduly/magazyn-core/config";
import type { ContentPageConfig } from "@moduly/config";
import type { GlobalContent, PageContentMap, SiteSettings } from "@moduly/types";
import { GlobalContentEditor } from "./global-content-editor";
import { PageContentEditor } from "./page-content-editor";
import { CmsRedeployButton } from "./cms-redeploy-button";

type Props = {
	siteSettings: SiteSettings;
	pageContent: PageContentMap;
	globalContent: GlobalContent;
	pages: ContentPageConfig[];
	activeTab: "global" | string;
};

const BASE = `${getModulyConfig().basePath}/panel/cms`;

export function CmsSettingsClient({
	siteSettings,
	pageContent,
	globalContent,
	pages,
	activeTab,
}: Props) {
	const pathname = usePathname();
	const activePage = pages.find((p) => p.id === activeTab);

	return (
		<div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
			<nav aria-label="Zakładki CMS" className="flex shrink-0 flex-row flex-wrap gap-1 lg:w-52 lg:flex-col">
				<CmsTab href={BASE} label="Globalne" active={pathname === BASE} />
				{pages.map((page) => (
					<CmsTab key={page.id} href={`${BASE}/${page.id}`} label={page.label} active={pathname === `${BASE}/${page.id}`} />
				))}
			</nav>
			<div className="min-w-0 flex-1 flex flex-col gap-4">
				<CmsRedeployButton />
				{activeTab === "global" ? (
					<GlobalContentEditor siteSettings={siteSettings} globalContent={globalContent} />
				) : activePage ? (
					<PageContentEditor
						pageId={activePage.id}
						path={activePage.path}
						blocks={activePage.blocks}
						initial={pageContent[activePage.id] ?? {}}
					/>
				) : null}
			</div>
		</div>
	);
}

function CmsTab({ href, label, active }: { href: string; label: string; active: boolean }) {
	return (
		<Link
			href={href}
			aria-current={active ? "page" : undefined}
			className={cn(
				"rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
				active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
			)}
		>
			{label}
		</Link>
	);
}
