import { loadAdmin } from "@moduly/magazyn-core";
import { getModulyConfig } from "@moduly/magazyn-core/config";
import { notFound } from "next/navigation";
import { getSeoSettingsBundle } from "./seo-store";
import { SeoSettingsClient } from "./seo-settings-client";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ pageId: string }> };

export default async function SeoPageSettingsPage({ params }: Props) {
	const { pageId } = await params;
	const page = getModulyConfig().content.pages.find((p) => p.id === pageId);
	if (!page) notFound();

	const bundle = await loadAdmin(getSeoSettingsBundle);

	return (
		<div className="flex flex-col gap-6">
			<header>
				<h1 className="font-serif text-2xl text-foreground">SEO — {page.label}</h1>
				<p className="mt-1 text-sm text-muted-foreground">{page.path}</p>
			</header>

			<SeoSettingsClient
				siteSettings={bundle.siteSettings}
				pageSeo={bundle.pageSeo}
				pages={getModulyConfig().content.pages}
				activeTab={pageId}
			/>
		</div>
	);
}
