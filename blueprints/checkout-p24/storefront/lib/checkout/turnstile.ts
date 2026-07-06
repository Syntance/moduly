import { resolveMedusaFetchBase } from "@/lib/medusa/resolve-fetch-base";

/**
 * Cloudflare Turnstile — OPCJONALNA captcha za flagą `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
 * Domyślnie WYŁĄCZONA (captcha kosztuje 10-20% konwersji; rate-limit per IP jest
 * pierwszą linią obrony i działa zawsze). Włącz dopiero przy realnym abuse.
 * Zero-cookie, GDPR-safe (w przeciwieństwie do reCAPTCHA). CSP w `next.config`
 * już dopuszcza `challenges.cloudflare.com`.
 */

export const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || "";

/** Czy captcha jest włączona w tym środowisku. */
export function isTurnstileEnabled(): boolean {
  return TURNSTILE_SITE_KEY.length > 0;
}

const TURNSTILE_SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileApi = {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
      theme?: "light" | "dark" | "auto";
      action?: string;
    },
  ) => string;
  remove: (widgetId: string) => void;
  reset: (widgetId?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<TurnstileApi> | null = null;

/** Ładuje skrypt Turnstile jednokrotnie i zwraca jego API. */
export function loadTurnstile(): Promise<TurnstileApi> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Turnstile dostępny tylko w przeglądarce."));
  }
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<TurnstileApi>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src^="https://challenges.cloudflare.com/turnstile"]`,
    );
    const onReady = () => {
      if (window.turnstile) resolve(window.turnstile);
      else reject(new Error("Turnstile nie załadował się poprawnie."));
    };
    if (existing) {
      existing.addEventListener("load", onReady);
      existing.addEventListener("error", () =>
        reject(new Error("Błąd ładowania Turnstile.")),
      );
      if (window.turnstile) resolve(window.turnstile);
      return;
    }
    const script = document.createElement("script");
    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", onReady);
    script.addEventListener("error", () => {
      scriptPromise = null;
      reject(new Error("Błąd ładowania Turnstile."));
    });
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Weryfikuje token Turnstile po stronie backendu (`/store/custom/verify-turnstile`).
 * No-op (zwraca `true`), gdy captcha wyłączona — checkout nie może się o to wywrócić.
 */
export async function verifyTurnstileToken(token: string): Promise<boolean> {
  if (!isTurnstileEnabled()) return true;
  if (!token) return false;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
      ? { "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY }
      : {}),
  };

  try {
    const res = await fetch(
      `${resolveMedusaFetchBase()}/store/custom/verify-turnstile`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ token }),
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!res.ok) return false;
    const data = (await res.json()) as { ok?: boolean; success?: boolean };
    return data.ok === true || data.success === true;
  } catch {
    return false;
  }
}
