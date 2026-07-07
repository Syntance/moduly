import { cp, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Katalog główny monorepo moduly (apps/, packages/, cli/).
 *
 * Wspinamy się od __dirname do katalogu z markerami monorepo — stała liczba
 * `..` była błędna zależnie od tego, czy kod leci z src/ (tsx) czy dist/
 * (zbudowane CLI): `create` z dist szukał apps/ w cli/ i zawsze padał.
 */
export function resolveModulyRoot(): string {
	let dir = __dirname;
	for (let i = 0; i < 6; i++) {
		const hasMarkers =
			existsSyncSafe(path.join(dir, "apps")) &&
			existsSyncSafe(path.join(dir, "packages")) &&
			existsSyncSafe(path.join(dir, "pnpm-workspace.yaml"));
		if (hasMarkers) return dir;
		const parent = path.dirname(dir);
		if (parent === dir) break;
		dir = parent;
	}
	throw new Error(
		"Nie znaleziono katalogu monorepo moduly (markery: apps/, packages/, pnpm-workspace.yaml). Uruchamiaj CLI z klonu Syntance/moduly.",
	);
}

function existsSyncSafe(p: string): boolean {
	try {
		statSync(p);
		return true;
	} catch {
		return false;
	}
}

export async function pathExists(target: string): Promise<boolean> {
	try {
		await stat(target);
		return true;
	} catch {
		return false;
	}
}

/** Katalogi artefaktów — nigdy nie trafiają do projektu klienta. */
const SKIP_DIRS = new Set([
	"node_modules",
	".next",
	".turbo",
	".medusa",
	"dist",
	"coverage",
	".git",
]);

/**
 * Sekrety — nigdy nie kopiujemy realnych .env z monorepo do projektu
 * klienta (zostają wyłącznie .env.example).
 */
function isSecretFile(name: string): boolean {
	return name.startsWith(".env") && !name.endsWith(".example");
}

export async function copyDirectory(src: string, dest: string): Promise<void> {
	await mkdir(dest, { recursive: true });
	const entries = await readdir(src, { withFileTypes: true });

	for (const entry of entries) {
		const srcPath = path.join(src, entry.name);
		const destPath = path.join(dest, entry.name);

		if (SKIP_DIRS.has(entry.name)) {
			continue;
		}

		if (entry.isDirectory()) {
			await copyDirectory(srcPath, destPath);
		} else if (entry.isFile()) {
			if (isSecretFile(entry.name)) continue;
			await cp(srcPath, destPath);
		}
	}
}

export async function readTextFile(filePath: string): Promise<string | null> {
	if (!(await pathExists(filePath))) return null;
	return readFile(filePath, "utf8");
}

export async function writeTextFile(filePath: string, content: string): Promise<void> {
	await mkdir(path.dirname(filePath), { recursive: true });
	await writeFile(filePath, content, "utf8");
}

/** Dodaje wpisy do transpilePackages w tsconfig.json (Next.js). */
export async function patchTranspilePackages(
	tsconfigPath: string,
	packages: string[],
): Promise<void> {
	const raw = await readTextFile(tsconfigPath);
	if (!raw) {
		throw new Error(`Brak pliku tsconfig: ${tsconfigPath}`);
	}

	const json = JSON.parse(raw) as {
		compilerOptions?: { transpilePackages?: string[] };
	};

	const existing = json.compilerOptions?.transpilePackages ?? [];
	const merged = [...new Set([...existing, ...packages])].sort();
	json.compilerOptions = {
		...json.compilerOptions,
		transpilePackages: merged,
	};

	await writeTextFile(tsconfigPath, `${JSON.stringify(json, null, 2)}\n`);
}

/** Włącza moduły w `moduly.config.ts` przez zamianę `key: false` → `key: true`. */
export async function patchModulyConfigModules(
	configPath: string,
	moduleKeys: string[],
): Promise<void> {
	let content = await readTextFile(configPath);
	if (!content) {
		throw new Error(`Brak pliku moduly.config.ts: ${configPath}`);
	}

	for (const key of moduleKeys) {
		const falsePattern = new RegExp(`(\\b${key}\\s*:\\s*)false`);
		if (falsePattern.test(content)) {
			content = content.replace(falsePattern, "$1true");
		}
	}

	await writeTextFile(configPath, content);
}

/** Dokleja brakujące linie do .env.example. */
export async function appendEnvExample(
	envPath: string,
	lines: string[],
): Promise<void> {
	const existing = (await readTextFile(envPath)) ?? "";
	const missing = lines.filter((line) => {
		const key = line.split("=")[0]?.trim();
		return key ? !existing.includes(key) : false;
	});

	if (missing.length === 0) return;

	const block = `\n# --- moduly CLI ---\n${missing.join("\n")}\n`;
	await writeTextFile(envPath, existing.endsWith("\n") ? existing + block : existing + "\n" + block);
}

export type ModuleId =
	| "cms"
	| "magazyn"
	| "forms"
	| "returns"
	| "client-panel"
	| "commerce";

export type ModuleDefinition = {
	/** Pakiety workspace do transpilePackages. */
	packages: string[];
	/** Klucze w moduly.config.ts → modules.* */
	configModules: string[];
	/** Wpisy .env.example */
	envLines: string[];
	/** Ścieżki względem packages/ do skopiowania przy vendoringu poza monorepo. */
	vendorPaths: string[];
};

export const MODULE_DEFINITIONS: Record<ModuleId, ModuleDefinition> = {
	cms: {
		packages: ["@moduly/cms", "@moduly/seo-geo", "@moduly/data-store"],
		configModules: ["content"],
		envLines: [
			"POSTGRES_URL=postgresql://user:pass@localhost:5432/moduly_cms",
			"# CMS — revalidacja po zapisie treści",
			"MEDUSA_REVALIDATE_SECRET=change-me",
		],
		vendorPaths: ["cms", "seo-geo", "data-store", "types", "config"],
	},
	magazyn: {
		packages: [
			"@moduly/magazyn-core",
			"@moduly/magazyn-products",
			"@moduly/magazyn-orders",
			"@moduly/magazyn-categories",
			"@moduly/magazyn-content",
			"@moduly/magazyn-emails",
			"@moduly/auth-core",
			"@moduly/ui",
		],
		configModules: [
			"orders",
			"products",
			"categories",
			"content",
			"emails",
			"settings",
		],
		envLines: [
			"MEDUSA_BACKEND_URL=http://localhost:9000",
			"ADMIN_ALLOWLIST_EMAILS=admin@example.com",
			"JWT_SECRET=supersecret-change-me",
		],
		vendorPaths: [
			"magazyn-core",
			"magazyn-products",
			"magazyn-orders",
			"magazyn-categories",
			"magazyn-content",
			"magazyn-emails",
			"auth-core",
			"ui",
			"config",
			"types",
		],
	},
	forms: {
		packages: ["@moduly/magazyn-forms"],
		configModules: ["forms"],
		envLines: [
			"RESEND_API_KEY=",
			"RESEND_FROM=Kontakt <kontakt@example.com>",
		],
		vendorPaths: ["magazyn-forms", "data-store", "types"],
	},
	returns: {
		packages: ["@moduly/magazyn-returns"],
		configModules: ["returns"],
		envLines: [
			"# Zwroty — wymaga Medusa module returns w backendzie",
			"CUSTOMER_JWT_SECRET=",
		],
		vendorPaths: ["magazyn-returns", "data-store", "types"],
	},
	"client-panel": {
		packages: ["@moduly/client-panel"],
		configModules: ["returns", "forms"],
		envLines: [
			"CUSTOMER_JWT_SECRET=",
			"CUSTOMER_SESSION_COOKIE=customer_session",
			"CUSTOMER_SESSION_TTL_SEC=604800",
			"UPSTASH_REDIS_REST_URL=",
			"UPSTASH_REDIS_REST_TOKEN=",
		],
		vendorPaths: ["client-panel", "auth-core", "magazyn-returns", "magazyn-forms"],
	},
	commerce: {
		packages: ["@moduly/commerce", "@moduly/payments"],
		configModules: ["orders", "products"],
		envLines: [
			"MEDUSA_BACKEND_URL=http://localhost:9000",
			"MEDUSA_PUBLISHABLE_KEY=",
			"MEILISEARCH_HOST=http://localhost:7700",
			"MEILISEARCH_SEARCH_KEY=",
			"FEATURE_P24=1",
			"FEATURE_STRIPE=1",
			"FEATURE_TPAY=1",
		],
		vendorPaths: ["commerce", "payments", "types"],
	},
};

export async function vendorModulePackages(
	targetDir: string,
	moduleId: ModuleId,
	modulyRoot: string,
): Promise<void> {
	const definition = MODULE_DEFINITIONS[moduleId];
	const vendorDest = path.join(targetDir, "vendor", "moduly");

	for (const pkg of definition.vendorPaths) {
		const src = path.join(modulyRoot, "packages", pkg);
		const dest = path.join(vendorDest, pkg);

		if (!(await pathExists(src))) {
			console.warn(`  ⚠ Pominięto brakujący pakiet: packages/${pkg}`);
			continue;
		}

		await copyDirectory(src, dest);
	}
}
