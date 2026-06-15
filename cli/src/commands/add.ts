import path from "node:path";
import {
	appendEnvExample,
	MODULE_DEFINITIONS,
	type ModuleId,
	patchModulyConfigModules,
	patchTranspilePackages,
	resolveModulyRoot,
	vendorModulePackages,
} from "../lib/modules.js";

export type AddOptions = {
	module: ModuleId;
	target: string;
	/** Kopiuj źródła pakietów do vendor/ (projekty poza monorepo). */
	vendor?: boolean;
};

const VALID_MODULES = Object.keys(MODULE_DEFINITIONS) as ModuleId[];

export async function runAdd(options: AddOptions): Promise<void> {
	if (!VALID_MODULES.includes(options.module)) {
		throw new Error(
			`Nieznany moduł „${options.module}”. Dostępne: ${VALID_MODULES.join(", ")}`,
		);
	}

	const targetPath = path.resolve(options.target);
	const definition = MODULE_DEFINITIONS[options.module];
	const modulyRoot = resolveModulyRoot();

	console.log(`\n🔧 Dodawanie modułu „${options.module}” do ${targetPath}\n`);

	if (options.vendor) {
		console.log("  → Vendoring pakietów do vendor/moduly/…");
		await vendorModulePackages(targetPath, options.module, modulyRoot);
	}

	const configPath = path.join(targetPath, "moduly.config.ts");
	const tsconfigPath = path.join(targetPath, "tsconfig.json");
	const envPath = path.join(targetPath, ".env.example");

	console.log("  → Aktualizacja moduly.config.ts…");
	await patchModulyConfigModules(configPath, definition.configModules);

	console.log("  → Aktualizacja tsconfig.json (transpilePackages)…");
	await patchTranspilePackages(tsconfigPath, definition.packages);

	console.log("  → Aktualizacja .env.example…");
	await appendEnvExample(envPath, definition.envLines);

	console.log("\n✓ Moduł dodany.\n");
	console.log("Pakiety workspace:");
	for (const pkg of definition.packages) {
		console.log(`  - ${pkg}`);
	}
	console.log("\nNastępne kroki:");
	console.log(`  cd ${targetPath}`);
	console.log("  pnpm install");
	console.log("  # Uzupełnij .env.local według .env.example");
	if (options.module === "commerce" || options.module === "magazyn") {
		console.log("  # Uruchom backend Medusa: pnpm --filter @moduly/backend dev");
	}
	console.log("");
}
