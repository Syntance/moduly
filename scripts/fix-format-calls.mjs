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
		content = content.replace(
			/getModulyConfig\(\)\.locale/g,
			"getModulyConfig().commerce.locale",
		);
		content = content.replace(
			/formatPrice\(([^,]+),\s*([a-zA-Z]+Code)\)/g,
			"formatPrice($1, { currency: $2 })",
		);
		content = content.replace(
			/formatPrice\(([^,]+),\s*order\.currencyCode\)/g,
			"formatPrice($1, { currency: order.currencyCode })",
		);
		content = content.replace(
			/formatPrice\(([^,]+),\s*currencyCode\)/g,
			"formatPrice($1, { currency: currencyCode })",
		);
		if (content !== orig) fs.writeFileSync(file, content);
	});
}

console.log("format fixes done");
