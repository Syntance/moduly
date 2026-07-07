import { cp, mkdir, readFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { resolveModulyRoot } from "../lib/modules.js";

export type BlueprintOptions = {
	blueprint: string;
	target: string;
	/** Katalog aplikacji backendu w projekcie docelowym. */
	backendDir?: string;
	/** Katalog aplikacji storefrontu w projekcie docelowym. */
	storefrontDir?: string;
	/** Nadpisuj istniejące pliki (domyślnie: pomiń i zaraportuj). */
	force?: boolean;
};

type Manifest = {
	name: string;
	source?: string;
	env?: Record<string, string>;
};

async function* walk(dir: string): AsyncGenerator<string> {
	for (const entry of await readdir(dir)) {
		const p = path.join(dir, entry);
		if ((await stat(p)).isDirectory()) yield* walk(p);
		else yield p;
	}
}

/**
 * `moduly blueprint checkout-p24 --target ./projekt`
 *
 * Wgrywa gotowy, produkcyjnie utwardzony komplet plików (ADR 007) do
 * projektu: blueprint/backend → apps/backend, blueprint/storefront →
 * apps/<storefront>. Kończy listą wymaganych ENV z MANIFEST.json.
 */
export async function runBlueprint(options: BlueprintOptions): Promise<void> {
	const modulyRoot = resolveModulyRoot();
	const blueprintRoot = path.join(modulyRoot, "blueprints", options.blueprint);
	if (!existsSync(blueprintRoot)) {
		const available = existsSync(path.join(modulyRoot, "blueprints"))
			? (await readdir(path.join(modulyRoot, "blueprints"))).join(", ")
			: "(brak katalogu blueprints)";
		throw new Error(
			`Nieznany blueprint „${options.blueprint}”. Dostępne: ${available}`,
		);
	}

	const targetPath = path.resolve(options.target);
	const mapping: Array<[string, string]> = [
		["backend", options.backendDir ?? "apps/backend"],
		["storefront", options.storefrontDir ?? "apps/storefront"],
	];

	console.log(
		`\n📦 Blueprint „${options.blueprint}” → ${targetPath}\n`,
	);

	let copiedCount = 0;
	const skipped: string[] = [];

	for (const [sourceDir, destDir] of mapping) {
		const from = path.join(blueprintRoot, sourceDir);
		if (!existsSync(from)) continue;
		const to = path.join(targetPath, destDir);
		for await (const file of walk(from)) {
			const rel = path.relative(from, file);
			const dest = path.join(to, rel);
			if (!options.force && existsSync(dest)) {
				skipped.push(path.join(destDir, rel));
				continue;
			}
			await mkdir(path.dirname(dest), { recursive: true });
			await cp(file, dest);
			copiedCount += 1;
		}
	}

	console.log(`  ✓ Skopiowano ${copiedCount} plików.`);
	if (skipped.length > 0) {
		console.log(
			`  ⚠ Pominięto ${skipped.length} istniejących plików (użyj --force, by nadpisać):`,
		);
		for (const s of skipped.slice(0, 15)) console.log(`    - ${s}`);
		if (skipped.length > 15) console.log(`    … i ${skipped.length - 15} więcej`);
	}

	const manifestPath = path.join(blueprintRoot, "MANIFEST.json");
	if (existsSync(manifestPath)) {
		const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Manifest;
		if (manifest.env && Object.keys(manifest.env).length > 0) {
			console.log("\nWymagane ENV (uzupełnij w .env / panelach hostingu):");
			for (const [key, description] of Object.entries(manifest.env)) {
				console.log(`  ${key.padEnd(36)} ${description}`);
			}
		}
	}

	console.log("\nNastępne kroki:");
	console.log(`  cd ${targetPath}`);
	console.log("  pnpm install && pnpm typecheck");
	console.log(
		`  # Szczegóły i smoke-testy: blueprints/${options.blueprint}/README.md`,
	);
}
