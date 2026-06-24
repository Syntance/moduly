import { NextResponse } from "next/server";
import { getConfiguredMedusaBackendUrl } from "@moduly/commerce";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** Ten sam sekret server-to-server co notify-* / order-email / reconcile. */
function internalSecret(): string | undefined {
	return (
		process.env.ORDER_EMAIL_INTERNAL_SECRET?.replace(/\r\n/g, "").trim() ||
		process.env.MEDUSA_REVALIDATE_SECRET?.replace(/\r\n/g, "").trim() ||
		undefined
	);
}

/** Czy żądanie pochodzi z Vercel Cron (Bearer CRON_SECRET) lub ma sekret operatora. */
function isAuthorized(request: Request): boolean {
	const cronSecret = process.env.CRON_SECRET?.trim();
	const auth = request.headers.get("authorization")?.trim();
	if (cronSecret && auth === `Bearer ${cronSecret}`) return true;
	const secret = internalSecret();
	const provided = request.headers.get("x-order-email-secret")?.trim();
	return Boolean(secret && provided && provided === secret);
}

async function callReconcile(
	base: string,
	provider: "reconcile-p24" | "reconcile-tpay",
	secret: string,
	publishableKey: string,
): Promise<{ provider: string; ok: boolean; status: number; data: unknown }> {
	try {
		const res = await fetch(`${base}/store/custom/${provider}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				"x-order-email-secret": secret,
				...(publishableKey ? { "x-publishable-api-key": publishableKey } : {}),
			},
			body: "{}",
			signal: AbortSignal.timeout(50_000),
		});
		const data = await res.json().catch(() => ({}));
		return { provider, ok: res.ok, status: res.status, data };
	} catch (e) {
		return {
			provider,
			ok: false,
			status: 0,
			data: { error: e instanceof Error ? e.message : "call failed" },
		};
	}
}

/**
 * GET /api/cron/reconcile-payments
 *
 * Cron Vercel (patrz vercel.json) — siatka bezpieczeństwa płatności niezależna
 * od `MEDUSA_WORKER_MODE`. Woła backendowe `/store/custom/reconcile-*`, które
 * domykają opłacone, ale niesfinalizowane koszyki i wysyłają maile.
 *
 * Bramki sterowane flagami: P24 zawsze, tpay gdy `FEATURE_TPAY=1`.
 */
export async function GET(request: Request) {
	if (!isAuthorized(request)) {
		return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
	}

	const secret = internalSecret();
	if (!secret) {
		return NextResponse.json(
			{ ok: false, error: "missing ORDER_EMAIL_INTERNAL_SECRET / MEDUSA_REVALIDATE_SECRET" },
			{ status: 500 },
		);
	}

	const base = getConfiguredMedusaBackendUrl().replace(/\/$/, "");
	const publishableKey =
		process.env.MEDUSA_PUBLISHABLE_KEY?.trim() ||
		process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY?.trim() ||
		"";

	const providers: Array<"reconcile-p24" | "reconcile-tpay"> = ["reconcile-p24"];
	if (process.env.FEATURE_TPAY === "1") providers.push("reconcile-tpay");

	const results = await Promise.all(
		providers.map((p) => callReconcile(base, p, secret, publishableKey)),
	);

	const ok = results.every((r) => r.ok);
	return NextResponse.json({ ok, results }, { status: ok ? 200 : 502 });
}
