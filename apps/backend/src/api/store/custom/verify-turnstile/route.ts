import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

type Body = { token?: string };

function trimEnv(value: string | undefined): string | undefined {
  const trimmed = value?.replace(/\r\n/g, "").trim();
  return trimmed || undefined;
}

/**
 * POST /store/custom/verify-turnstile
 *
 * Weryfikuje token Cloudflare Turnstile (siteverify). OPCJONALNE — captcha jest
 * domyślnie WYŁĄCZONA. Gdy `TURNSTILE_SECRET_KEY` nie jest ustawiony, endpoint
 * przepuszcza (`ok: true`), żeby checkout nie wywracał się przy wyłączonej
 * captchy. Włączasz dopiero przy realnym abuse (rate-limit działa zawsze).
 */
export async function POST(req: MedusaRequest<Body>, res: MedusaResponse) {
  const secret = trimEnv(process.env.TURNSTILE_SECRET_KEY);

  // Captcha wyłączona — przepuszczamy (rate-limit jest pierwszą linią obrony).
  if (!secret) {
    return res.status(200).json({ ok: true, skipped: true });
  }

  const token = req.body?.token?.trim();
  if (!token) {
    return res.status(400).json({ ok: false, error: "Brak tokenu captcha." });
  }

  try {
    const form = new URLSearchParams();
    form.set("secret", secret);
    form.set("response", token);
    const xff = req.headers["x-forwarded-for"];
    const ip = (typeof xff === "string" ? xff : xff?.[0])?.split(",")[0]?.trim();
    if (ip) form.set("remoteip", ip);

    const verify = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
        signal: AbortSignal.timeout(10_000),
      },
    );
    const data = (await verify.json().catch(() => ({}))) as { success?: boolean };
    if (data.success) {
      return res.status(200).json({ ok: true });
    }
    return res.status(200).json({ ok: false });
  } catch (e) {
    console.warn("[verify-turnstile] error", e);
    // Fail-closed gdy captcha włączona, a siteverify niedostępne.
    return res.status(200).json({ ok: false });
  }
}
