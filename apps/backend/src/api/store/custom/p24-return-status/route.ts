import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import {
  ContainerRegistrationKeys,
  remoteQueryObjectFromString,
} from "@medusajs/framework/utils";
import {
  fetchP24TransactionBySessionId,
  loadP24ApiConfig,
  resolveP24ReturnOutcome,
  type P24SessionData,
} from "../../../../lib/p24-transaction-api";
import { PRZELEWY24_PROVIDER_ID } from "../../../../lib/p24-reconcile";
import { dispatchPaymentFailedEmailViaStorefront } from "../../../../lib/payment-failed-email-dispatch";

type Body = {
  cart_id?: string;
  /** Po krótkim pollingu — status 0 traktujemy jako nieudaną płatność. */
  allow_failed_on_zero?: boolean;
  /** Wyślij mail payment_failed (deduplikacja per sesja P24). */
  send_failed_email?: boolean;
};

function storefrontBase(): string {
  return (
    process.env.STOREFRONT_URL?.replace(/\/$/, "") ??
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "https://modulyconcept.pl"
  );
}

/**
 * POST /store/custom/p24-return-status
 *
 * Zwraca wynik płatności P24 po powrocie klienta z bramki (paid | pending | failed).
 */
export async function POST(req: MedusaRequest<Body>, res: MedusaResponse) {
  const cartId = req.body?.cart_id?.trim();
  if (!cartId) {
    return res.status(400).json({ message: "cart_id jest wymagane" });
  }

  const allowFailedOnZero = req.body?.allow_failed_on_zero === true;
  const sendFailedEmail = req.body?.send_failed_email === true;
  const scope = req.scope;
  const remoteQuery = scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY);

  const cartObject = remoteQueryObjectFromString({
    entryPoint: "cart",
    variables: { filters: { id: cartId } },
    fields: [
      "id",
      "email",
      "completed_at",
      "payment_collection.payment_sessions.id",
      "payment_collection.payment_sessions.provider_id",
      "payment_collection.payment_sessions.status",
      "payment_collection.payment_sessions.created_at",
      "payment_collection.payment_sessions.data",
    ],
  });
  const [cartRow] = await remoteQuery(cartObject);
  if (!cartRow) {
    return res.status(404).json({ message: "Koszyk nie istnieje" });
  }
  // Defense-in-depth (incydent cart-express 06.07.2026): remoteQuery potrafi
  // przy niektórych polach zgubić filtr — nie wolno raportować stanu płatności
  // cudzego koszyka.
  if ((cartRow as { id?: string }).id !== cartId) {
    return res.status(500).json({ message: "Błąd odczytu koszyka" });
  }

  const cart = cartRow as {
    completed_at?: string | null;
    email?: string;
    payment_collection?: {
      payment_sessions?: Array<{
        provider_id?: string;
        status?: string;
        data?: P24SessionData;
      }>;
    };
  };

  if (cart.completed_at) {
    return res.status(200).json({ status: "paid" as const, email: cart.email ?? "" });
  }

  const sessions = cart.payment_collection?.payment_sessions ?? [];
  /** Najnowsza sesja P24 — po retry stara jest usuwana, ale sortujemy defensywnie. */
  const p24Session = sessions
    .filter((s) => s.provider_id === PRZELEWY24_PROVIDER_ID)
    .sort((a, b) => {
      const aTime = new Date(
        (a as { created_at?: string | Date }).created_at ?? 0,
      ).getTime();
      const bTime = new Date(
        (b as { created_at?: string | Date }).created_at ?? 0,
      ).getTime();
      return bTime - aTime;
    })[0];

  if (!p24Session?.data) {
    return res.status(422).json({
      message: "Brak sesji płatności Przelewy24 dla tego koszyka",
      status: "failed" as const,
    });
  }

  const sessionData = p24Session.data;
  const p24Config = loadP24ApiConfig();
  let tx = null;
  if (p24Config && sessionData.p24_session_id) {
    tx = await fetchP24TransactionBySessionId(
      sessionData.p24_session_id,
      p24Config,
    );
  }

  const status = resolveP24ReturnOutcome({
    sessionData,
    tx,
    allowFailedOnZero,
    sessionCreatedAt: (p24Session as { created_at?: string | Date }).created_at ?? null,
  });

  const retryUrl = `${storefrontBase()}/checkout/p24/retry?cart_id=${encodeURIComponent(cartId)}`;
  const p24SessionId = sessionData.p24_session_id ?? "";

  let emailSent = false;
  if (sendFailedEmail && status === "failed") {
    const mail = await dispatchPaymentFailedEmailViaStorefront({
      cartId,
      p24SessionId: p24SessionId || undefined,
    });
    emailSent = mail.ok && !mail.skipped;
  }

  return res.status(200).json({
    status,
    email: cart.email ?? "",
    retry_url: retryUrl,
    p24_session_id: p24SessionId || undefined,
    p24_status: tx?.status ?? null,
    email_sent: emailSent,
  });
}
