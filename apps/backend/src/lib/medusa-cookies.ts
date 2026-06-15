import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type { CookieAdapter, CookieSetOptions } from "./auth/cookies";

function parseCookieHeader(header: string | undefined): Record<string, string> {
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq);
    const value = trimmed.slice(eq + 1);
    out[key] = decodeURIComponent(value);
  }
  return out;
}

export function createMedusaCookieAdapter(
  req: MedusaRequest,
  res: MedusaResponse,
): CookieAdapter {
  let cookies = parseCookieHeader(
    typeof req.headers.cookie === "string" ? req.headers.cookie : undefined,
  );

  return {
    get(name: string) {
      return cookies[name];
    },
    set(name: string, value: string, options: CookieSetOptions) {
      const segments = [
        `${name}=${encodeURIComponent(value)}`,
        `Path=${options.path}`,
        `Max-Age=${options.maxAge}`,
        `SameSite=${options.sameSite}`,
      ];
      if (options.httpOnly) segments.push("HttpOnly");
      if (options.secure) segments.push("Secure");
      res.append("Set-Cookie", segments.join("; "));
      cookies = { ...cookies, [name]: value };
    },
    delete(name: string) {
      res.append(
        "Set-Cookie",
        `${name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`,
      );
      const next = { ...cookies };
      delete next[name];
      cookies = next;
    },
  };
}
