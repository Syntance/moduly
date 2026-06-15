import { loadAdmin } from "@moduly/magazyn-core";
import { getModulyConfig } from "@moduly/magazyn-core/config";
import { getContentBundle } from "./content-store";
import { CmsSettingsClient } from "./cms-settings-client";

export const dynamic = "force-dynamic";

export default async function CmsPage() {
	const bundle = await loadAdmin(getContentBundle);

	return (
		<div className="flex flex-col gap-6">
			<header>
				<h1 className="font-serif text-2xl text-foreground">CMS</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Treści i zdjęcia sekcji witryny — per podstrona i globalnie.
				</p>
			</header>
			<CmsSettingsClient
				siteSettings={bundle.siteSettings}
				pageContent={bundle.pageContent}
				globalContent={bundle.globalContent}
				pages={getModulyConfig().content.pages}
				activeTab="global"
			/>
		</div>
	);
}
