function trimEnv(value: string | undefined): string | undefined {
  const trimmed = value?.replace(/\r\n/g, "").trim();
  return trimmed || undefined;
}

/** Woła storefront — szablon payment_failed z magazynu. */
export async function dispatchPaymentFailedEmailViaStorefront(params: {
  cartId: string;
  p24SessionId?: string;
}): Promise<{ ok: boolean; skipped?: boolean }> {
  const storefrontUrl = trimEnv(process.env.STOREFRONT_URL);
  const secret =
    trimEnv(process.env.ORDER_EMAIL_INTERNAL_SECRET) ??
    trimEnv(process.env.MEDUSA_REVALIDATE_SECRET);
  if (!storefrontUrl || !secret) {
    console.warn("[mail] payment-failed: brak STOREFRONT_URL lub secret");
    return { ok: false };
  }

  try {
    const res = await fetch(
      `${storefrontUrl.replace(/\/$/, "")}/api/internal/payment-failed-email`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-order-email-secret": secret,
        },
        body: JSON.stringify({
          cart_id: params.cartId,
          ...(params.p24SessionId
            ? { p24_session_id: params.p24SessionId }
            : {}),
        }),
        signal: AbortSignal.timeout(20_000),
      },
    );
    if (!res.ok) {
      console.warn("[mail] payment-failed internal API", res.status);
      return { ok: false };
    }
    const data = (await res.json()) as { ok?: boolean; skipped?: boolean };
    if (data.ok) {
      console.info(
        `[mail] payment-failed cart=${params.cartId} session=${params.p24SessionId ?? "—"} skipped=${Boolean(data.skipped)}`,
      );
      return { ok: true, skipped: data.skipped };
    }
  } catch (e) {
    console.warn("[mail] payment-failed internal API error", e);
  }
  return { ok: false };
}
