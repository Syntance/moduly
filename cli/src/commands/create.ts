import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
	copyDirectory,
	pathExists,
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

/** Pliki root monorepo kopiowane 1:1 do projektu. */
const ROOT_FILES = ["tsconfig.base.json", "turbo.json", "eslint.config.js"];

/**
 * `moduly create sklep|strona --target ./projekt`
 *
 * Tworzy SAMODZIELNY projekt (mini-monorepo) gotowy do `pnpm install`:
 *
 *   projekt/
 *     apps/sklep        (starter; sklep ma już wgrany blueprint checkout-p24)
 *     apps/backend      (tylko sklep — Medusa v2)
 *     packages/*        (komplet @moduly/* — workspace:* działa standalone)
 *     pnpm-workspace.yaml, package.json, tsconfig.base.json, turbo.json
 *
 * Kopiowanie pomija sekrety (.env, .env.local — zostają .env.example),
 * node_modules i artefakty buildów.
 */
export async function runCreate(options: CreateOptions): Promise<void> {
	const modulyRoot = resolveModulyRoot();
	const starterName = STARTER_MAP[options.type];
	const starterPath = path.join(modulyRoot, "apps", starterName);
	const targetPath = path.resolve(options.target);
	const appDirName = options.type; // apps/strona | apps/sklep

	if (!(await pathExists(starterPath))) {
		throw new Error(
			`Brak szablonu apps/${starterName} w repozytorium moduly. Upewnij się, że klonujesz pełne repo Syntance/moduly.`,
		);
	}

	if (await pathExists(targetPath)) {
		const entries = await readdir(targetPath);
		if (entries.length > 0) {
			throw new Error(`Katalog docelowy nie jest pusty: ${targetPath}`);
		}
	}

	console.log(`\n📦 Tworzenie projektu „${options.type}”…`);
	console.log(`   Szablon: apps/${starterName} (+ packages/*${options.type === "sklep" ? " + apps/backend" : ""})`);
	console.log(`   Cel:     ${targetPath}\n`);

	// 1. Aplikacja frontowa.
	await copyDirectory(starterPath, path.join(targetPath, "apps", appDirName));

	// 2. Sklep = również backend Medusa (blueprint checkout-p24 w komplecie).
	if (options.type === "sklep") {
		const backendPath = path.join(modulyRoot, "apps", "backend");
		if (!(await pathExists(backendPath))) {
			throw new Error("Brak apps/backend w repozytorium moduly.");
		}
		await copyDirectory(backendPath, path.join(targetPath, "apps", "backend"));
	}

	// 3. Komplet pakietów — `workspace:*` musi działać poza monorepo moduly.
	const packagesRoot = path.join(modulyRoot, "packages");
	for (const pkg of await readdir(packagesRoot)) {
		await copyDirectory(
			path.join(packagesRoot, pkg),
			path.join(targetPath, "packages", pkg),
		);
	}

	// 4. Pliki root: tsconfig.base (extends ../../ z apps i packages), turbo, eslint.
	for (const file of ROOT_FILES) {
		const src = path.join(modulyRoot, file);
		if (await pathExists(src)) {
			await writeFile(
				path.join(targetPath, file),
				await readFile(src, "utf8"),
			);
		}
	}

	// 5. pnpm-workspace + root package.json (skrypty przez turbo, jak w moduly).
	const rootPkg = JSON.parse(
		await readFile(path.join(modulyRoot, "package.json"), "utf8"),
	) as {
		packageManager?: string;
		pnpm?: Record<string, unknown>;
		devDependencies?: Record<string, string>;
	};

	await writeFile(
		path.join(targetPath, "pnpm-workspace.yaml"),
		`packages:\n  - "apps/*"\n  - "packages/*"\n`,
	);

	const projectName = path.basename(targetPath).replace(/[^a-z0-9-]/gi, "-").toLowerCase() || "moduly-projekt";
	const projectPackageJson = {
		name: projectName,
		private: true,
		packageManager: rootPkg.packageManager ?? "pnpm@9.15.4",
		engines: { node: ">=20.0.0" },
		scripts: {
			dev: "turbo dev",
			build: "turbo build",
			lint: "turbo lint",
			typecheck: "turbo typecheck",
			test: "turbo test",
			clean: "turbo clean",
		},
		...(rootPkg.pnpm ? { pnpm: rootPkg.pnpm } : {}),
		devDependencies: {
			turbo: rootPkg.devDependencies?.turbo ?? "^2.5.0",
		},
	};
	await writeFile(
		path.join(targetPath, "package.json"),
		`${JSON.stringify(projectPackageJson, null, 2)}\n`,
	);

	// 6. README projektu.
	const envHint =
		options.type === "sklep"
			? "apps/sklep/.env.example i apps/backend/.env.example"
			: "apps/strona/.env.example";
	await writeFile(
		path.join(targetPath, "README.md"),
		[
			`# ${projectName}`,
			"",
			`Projekt wygenerowany przez \`moduly create ${options.type}\` (Syntance/moduly).`,
			"",
			"## Start",
			"",
			"```bash",
			"pnpm install",
			`# uzupełnij .env.local według: ${envHint}`,
			"pnpm dev",
			"```",
			"",
			options.type === "sklep"
				? "Checkout Przelewy24 (blueprint checkout-p24, ADR 007 moduly) jest wgrany — klucze P24/Upstash/Resend w .env backendu. Smoke-testy: `apps/sklep/tests-e2e/checkout-chaos.e2e.spec.ts`."
				: "Panel CMS: `/magazyn/panel` (wymaga DATABASE_URL — Postgres).",
			"",
			"Motyw panelu magazynu: `docs/theming-magazyn.md` w repo moduly.",
			"",
		].join("\n"),
	);

	console.log("✓ Skopiowano startera, pakiety i pliki root.\n");
	console.log("Następne kroki:");
	console.log(`  cd ${targetPath}`);
	console.log("  pnpm install");
	console.log(`  # uzupełnij .env.local (${envHint})`);
	console.log("  pnpm dev");
	console.log("");
}
