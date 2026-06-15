import path from "node:path";
import {
	appendEnvExample,
	copyDirectory,
	pathExists,
	patchModulyConfigModules,
	patchTranspilePackages,
	resolveModulyRoot,
} from "../lib/modules.js";

export type CreateOptions = {
	type: "strona" | "sklep";
	target: string;
};

const STARTER_MAP = {
	strona: "starter-strona",
	sklep: "starter-sklep",
} as const;

export async function runCreate(options: CreateOptions): Promise<void> {
	const modulyRoot = resolveModulyRoot();
	const starterName = STARTER_MAP[options.type];
	const starterPath = path.join(modulyRoot, "apps", starterName);
	const targetPath = path.resolve(options.target);

	if (!(await pathExists(starterPath))) {
		throw new Error(
			`Brak szablonu apps/${starterName} w repozytorium moduly. Upewnij się, że klonujesz pełne repo Syntance/moduly.`,
		);
	}

	if (await pathExists(targetPath)) {
		const entries = await import("node:fs/promises").then((fs) =>
			fs.readdir(targetPath),
		);
		if (entries.length > 0) {
			throw new Error(`Katalog docelowy nie jest pusty: ${targetPath}`);
		}
	}

	console.log(`\n📦 Tworzenie projektu „${options.type}”…`);
	console.log(`   Szablon: apps/${starterName}`);
	console.log(`   Cel:     ${targetPath}\n`);

	await copyDirectory(starterPath, targetPath);

	console.log("✓ Skopiowano pliki startera.\n");
	console.log("Następne kroki:");
	console.log(`  cd ${targetPath}`);
	console.log("  pnpm install");
	console.log("  cp .env.example .env.local   # uzupełnij sekrety");
	if (options.type === "sklep") {
		console.log("  pnpm dev                     # storefront + backend Medusa");
	} else {
		console.log("  pnpm dev                     # strona CMS");
	}
	console.log("");
}
