import { loadAdmin } from "@moduly/magazyn-core";
import { getModulyConfig } from "@moduly/magazyn-core/config";
import { notFound } from "next/navigation";
import { getContentBundle } from "./content-store";
import { CmsSettingsClient } from "./cms-settings-client";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ pageId: string }> };

export default async function CmsPageEditorPage({ params }: Props) {
	const { pageId } = await params;
	const page = getModulyConfig().content.pages.find((p) => p.id === pageId);
	if (!page) notFound();

	const bundle = await loadAdmin(getContentBundle);

	return (
		<div className="flex flex-col gap-6">
			<header>
				<h1 className="font-serif text-2xl text-foreground">CMS — {page.label}</h1>
				<p className="mt-1 text-sm text-muted-foreground">{page.path}</p>
			</header>
			<CmsSettingsClient
				siteSettings={bundle.siteSettings}
				pageContent={bundle.pageContent}
				globalContent={bundle.globalContent}
				pages={getModulyConfig().content.pages}
				activeTab={pageId}
			/>
		</div>
	);
}
