import fs from "node:fs";
import path from "node:path";

const root = "E:/Software development/moduly/packages";
const packages = [
	"magazyn-products",
	"magazyn-orders",
	"magazyn-categories",
	"magazyn-emails",
	"magazyn-content",
];

const replacements = [
	["@magazyn/core/config/types", "@moduly/config"],
	["@magazyn/core/lib/trigger-vercel-deploy", "@moduly/magazyn-core"],
	["@magazyn/core/hooks/use-prevent-window-file-drop", "@moduly/magazyn-core/hooks/use-prevent-window-file-drop"],
	["@/lib/content/asset-url", "@moduly/magazyn-core"],
	["@magazyn/modules/content/seo/seo-store", "./seo/seo-store"],
	["@magazyn/modules/content/seo/seo-settings-client", "./seo/seo-settings-client"],
	["@magazyn/modules/products/actions", "@moduly/magazyn-products"],
	["@magazyn/modules/emails/send-order-email", "./send-order-email"],
	["@/lib/resend/config", "./lib/resend-config"],
	["@/lib/payment/bank-transfer", "./lib/bank-transfer"],
	["getModulyConfig().currency", "getModulyConfig().commerce.currency"],
	["getModulyConfig().bankTransfer", "getModulyConfig().payments.bankTransfer"],
];

function walk(dir, cb) {
	for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
		const p = path.join(dir, ent.name);
		if (ent.isDirectory()) walk(p, cb);
		else if (/\.(ts|tsx)$/.test(ent.name)) cb(p);
	}
}

for (const pkg of packages) {
	const dir = path.join(root, pkg, "src");
	if (!fs.existsSync(dir)) continue;
	walk(dir, (file) => {
		let content = fs.readFileSync(file, "utf8");
		const orig = content;
		for (const [from, to] of replacements) {
			content = content.split(from).join(to);
		}
		if (content !== orig) fs.writeFileSync(file, content);
	});
}

const dupes = [
	"magazyn-content/src/seo-store.ts",
	"magazyn-content/src/seo-settings-client.tsx",
	"magazyn-content/src/seo-page.tsx",
	"magazyn-content/src/seo-form.tsx",
	"magazyn-content/src/seo-actions.ts",
	"magazyn-content/src/page-seo-page.tsx",
	"magazyn-content/src/og-image-field.tsx",
];
for (const rel of dupes) {
	const p = path.join(root, rel);
	if (fs.existsSync(p)) fs.unlinkSync(p);
}

console.log("port-imports-2 done");
