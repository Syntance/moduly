/** Domyślny nadawca Resend — nadpisz RESEND_FROM w ENV. */
export const RESEND_DEFAULT_FROM = "Moduly Sklep <kontakt@example.com>";

export const RESEND_DEFAULT_REPLY_TO = "kontakt@example.com";

export const RESEND_DEFAULT_CONTACT_EMAIL = "kontakt@example.com";

function trimEnv(value: string | undefined): string | undefined {
  const trimmed = value?.replace(/\r\n/g, "").trim();
  return trimmed || undefined;
}

export type ResendRuntimeConfig = {
  apiKey: string | undefined;
  from: string;
  replyTo: string;
  configured: boolean;
};

export function resolveResendFromAddress(
  fromRaw?: string,
  emailRaw?: string,
  fromName = "Moduly Sklep",
): string {
  const from = trimEnv(fromRaw);
  if (from) {
    if (from.includes("<")) return from;
    return `${fromName} <${from}>`;
  }
  const email = trimEnv(emailRaw) ?? RESEND_DEFAULT_CONTACT_EMAIL;
  return `${fromName} <${email}>`;
}

export function getResendConfig(fromName = "Moduly Sklep"): ResendRuntimeConfig {
  const apiKey = trimEnv(process.env.RESEND_API_KEY);
  const from = resolveResendFromAddress(
    process.env.RESEND_FROM,
    process.env.RESEND_FROM_EMAIL,
    fromName,
  );
  const replyTo =
    trimEnv(process.env.RESEND_REPLY_TO) ??
    trimEnv(process.env.CONTACT_INBOX_EMAIL) ??
    RESEND_DEFAULT_REPLY_TO;

  return {
    apiKey,
    from,
    replyTo,
    configured: Boolean(apiKey),
  };
}
