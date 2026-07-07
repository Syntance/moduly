/**
 * Weryfikacja blueprintu checkout-p24 (ADR 007, faza 3 — CI).
 *
 * 1. Wgrywa blueprint do apps/backend + apps/starter-sklep (idempotentne —
 *    startery są zmigrowane NA blueprint, więc to no-op przy braku dryfu).
 * 2. Odpala typecheck obu aplikacji.
 *
 * Zielony przebieg = blueprint jest instalowalny i kompiluje się w realnym
 * projekcie. Uruchamiaj w CI po każdej zmianie w blueprints/ lub starterach:
 *
 *   node scripts/verify-blueprint.mjs
 */
import { execSync } from "node:child_process";
import { cpSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BP = join(ROOT, "blueprints", "checkout-p24");
const MAP = [
  [join(BP, "backend"), join(ROOT, "apps", "backend")],
  [join(BP, "storefront"), join(ROOT, "apps", "starter-sklep")],
];

function* walk(dir) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}

let copied = 0;
for (const [src, dst] of MAP) {
  for (const f of walk(src)) {
    const rel = relative(src, f);
    const dest = join(dst, rel);
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(f, dest);
    copied += 1;
  }
}
console.log(`[verify-blueprint] wgrano ${copied} plików blueprintu.`);

const run = (cmd, cwd) => {
  console.log(`[verify-blueprint] ${cmd} (${relative(ROOT, cwd) || "."})`);
  execSync(cmd, { cwd, stdio: "inherit" });
};

run("npx tsc --noEmit", join(ROOT, "apps", "backend"));
run("npx tsc --noEmit", join(ROOT, "apps", "starter-sklep"));

console.log("[verify-blueprint] OK — blueprint instalowalny, typecheck zielony.");
