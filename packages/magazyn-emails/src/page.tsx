import { loadAdmin } from "@moduly/magazyn-core";
import { getModulyConfig } from "@moduly/magazyn-core/config";
import { getAllEmailTemplates } from "./store";
import { EmailsList } from "./emails-list";

export const dynamic = "force-dynamic";

export default async function MailePage() {
	const templates = await loadAdmin(getAllEmailTemplates);
	const basePath = getModulyConfig().basePath;

	return <EmailsList templates={templates} basePath={basePath} />;
}
