#!/usr/bin/env node
import { Command } from "commander";
import { runAdd } from "./commands/add.js";
import { runBlueprint } from "./commands/blueprint.js";
import { runCreate } from "./commands/create.js";

const program = new Command();

program
	.name("moduly")
	.description("CLI systemu Moduly — tworzenie projektów i dokładanie modułów")
	.version("0.1.0");

program
	.command("create")
	.description("Utwórz nowy projekt ze startera (strona | sklep)")
	.argument("<type>", "strona lub sklep")
	.option("-t, --target <dir>", "katalog docelowy", ".")
	.action(async (type: string, opts: { target: string }) => {
		if (type !== "strona" && type !== "sklep") {
			console.error("Typ musi być „strona” lub „sklep”.");
			process.exit(1);
		}
		try {
			await runCreate({ type, target: opts.target });
		} catch (error) {
			console.error(error instanceof Error ? error.message : error);
			process.exit(1);
		}
	});

program
	.command("add")
	.description(
		"Dodaj moduł do istniejącego projektu (cms|magazyn|forms|returns|client-panel|commerce)",
	)
	.argument("<module>", "nazwa modułu")
	.requiredOption("-t, --target <dir>", "katalog projektu docelowego")
	.option("--vendor", "skopiuj źródła pakietów do vendor/moduly/ (poza monorepo)")
	.action(async (module: string, opts: { target: string; vendor?: boolean }) => {
		try {
			await runAdd({
				module: module as Parameters<typeof runAdd>[0]["module"],
				target: opts.target,
				vendor: opts.vendor,
			});
		} catch (error) {
			console.error(error instanceof Error ? error.message : error);
			process.exit(1);
		}
	});

program
	.command("blueprint")
	.description(
		"Wgraj produkcyjnie utwardzony blueprint do projektu (np. checkout-p24, ADR 007)",
	)
	.argument("<name>", "nazwa blueprintu (katalog w blueprints/)")
	.requiredOption("-t, --target <dir>", "katalog projektu docelowego")
	.option("--backend-dir <dir>", "katalog aplikacji backendu", "apps/backend")
	.option(
		"--storefront-dir <dir>",
		"katalog aplikacji storefrontu",
		"apps/storefront",
	)
	.option("--force", "nadpisuj istniejące pliki")
	.action(
		async (
			name: string,
			opts: {
				target: string;
				backendDir: string;
				storefrontDir: string;
				force?: boolean;
			},
		) => {
			try {
				await runBlueprint({
					blueprint: name,
					target: opts.target,
					backendDir: opts.backendDir,
					storefrontDir: opts.storefrontDir,
					force: opts.force,
				});
			} catch (error) {
				console.error(error instanceof Error ? error.message : error);
				process.exit(1);
			}
		},
	);

program.parse();
