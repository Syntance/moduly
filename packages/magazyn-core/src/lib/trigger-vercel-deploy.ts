import "server-only";

import { serverEnv } from "../env";

/**
 * Uruchamia produkcyjny deploy na Vercel (Deploy Hook).
 * Po deployu `prebuild` ściąga CMS → static files → instant load.
 */
export async function triggerVercelDeploy(reason?: string): Promise<boolean> {
	const hookUrl = serverEnv.vercelDeployHookUrl;
	if (!hookUrl) {
		console.warn(
			"[Deploy] VERCEL_DEPLOY_HOOK_URL nie ustawiony — pomijam auto-deploy.",
			reason ? `(${reason})` : "",
		);
		return false;
	}

	try {
		const target = new URL(hookUrl);
		target.searchParams.set("buildCache", "false");
		const res = await fetch(target.toString(), {
			method: "POST",
			signal: AbortSignal.timeout(30_000),
		});

		if (!res.ok) {
			console.error(`[Deploy] Hook failed: ${res.status} ${res.statusText}`);
			return false;
		}

		console.log("[Deploy] Vercel deploy triggered", reason ? `(${reason})` : "");
		return true;
	} catch (error) {
		console.error("[Deploy] Hook error:", error);
		return false;
	}
}
