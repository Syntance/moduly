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
	["@magazyn/core/medusa/client", "@moduly/magazyn-core"],
	["@magazyn/core/medusa/errors", "@moduly/magazyn-core"],
	["@magazyn/core/medusa/session", "@moduly/magazyn-core"],
	["@magazyn/core/medusa/media-url", "@moduly/magazyn-core"],
	["@magazyn/core/lib/format", "@moduly/magazyn-core"],
	["@magazyn/core/lib/slug", "@moduly/magazyn-core"],
	["@magazyn/core/lib/cn", "@moduly/ui"],
	["@magazyn/core/lib/revalidate-storefront", "@moduly/magazyn-core"],
	["@magazyn/core/audit/audit-log", "@moduly/magazyn-core"],
	["@magazyn/core/auth/load", "@moduly/magazyn-core"],
	["@magazyn/core/auth/require-session", "@moduly/magazyn-core"],
	["@magazyn/core/ui/button", "@moduly/ui"],
	["@magazyn/core/ui/input", "@moduly/ui"],
	["@magazyn/core/ui/confirm-dialog", "@moduly/ui"],
	["@magazyn/core/ui/switch", "@moduly/ui"],
	["@magazyn/core/ui/checkbox", "@moduly/ui"],
	["@magazyn/core/hooks/use-file-drop-zone", "@moduly/magazyn-core/hooks/use-file-drop-zone"],
	["@magazyn/magazyn.config", "@moduly/magazyn-core/config"],
	["@/lib/medusa/category-tree", "@moduly/magazyn-core"],
	["@/lib/medusa/category-sort", "@moduly/magazyn-core"],
	["@/lib/medusa/product-thumbnail", "./lib/product-thumbnail"],
	["@/lib/cart/format-line-item-for-email", "./lib/format-line-item-for-email"],
	["@/lib/cart/line-item-extras", "./lib/line-item-extras"],
	["@/lib/files/file-type", "./lib/file-type"],
	["@/lib/content/parsers", "@moduly/cms/parsers"],
	["@/lib/content/types", "@moduly/types"],
	["@/lib/content/metadata-keys", "@moduly/cms/metadata-keys"],
	["@magazyn/modules/content/cms-id", "@moduly/magazyn-content/cms-id"],
	["@magazyn/modules/content/seo/og-image-field", "@moduly/magazyn-content/seo/og-image-field"],
	["@/lib/product-upload/product-file", "@moduly/magazyn-core"],
	["magazynConfig", "getModulyConfig()"],
];

function walk(dir, cb) {
	for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
		const p = path.join(dir, ent.name);
		if (ent.isDirectory()) walk(p, cb);
		else if (/\.(ts|tsx|css)$/.test(ent.name)) cb(p);
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
		if (
			content.includes("getModulyConfig()") &&
			!content.includes("@moduly/magazyn-core/config")
		) {
			content = "import { getModulyConfig } from '@moduly/magazyn-core/config';\n" + content;
		}
		if (content !== orig) fs.writeFileSync(file, content);
	});
}

console.log("port-imports done");
