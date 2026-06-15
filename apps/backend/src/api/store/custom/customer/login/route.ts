import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import {
  getCustomerOtpAuth,
  sendCustomerOtpEmail,
} from "../../../../../lib/customer-auth";

type Body = { email?: string };

/**
 * POST /store/custom/customer/login
 * Wysyła 6-cyfrowy OTP na e-mail klienta (musi mieć zamówienia w sklepie).
 */
export async function POST(req: MedusaRequest<Body>, res: MedusaResponse) {
  const email = bodyEmail(req.body);
  if (!email) {
    return res.status(400).json({ message: "Adres e-mail jest wymagany." });
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as {
    graph: (args: unknown) => Promise<{ data: Array<{ id?: string }> }>;
  };

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id"],
    filters: { email: email.toLowerCase() },
    pagination: { take: 1 },
  });

  if (!orders.length) {
    return res.status(404).json({
      message: "Nie znaleźliśmy zamówień dla tego adresu e-mail.",
    });
  }

  const auth = getCustomerOtpAuth();
  const code = await auth.createOtp(email);
  const sent = await sendCustomerOtpEmail(email, code);

  if (!sent) {
    return res.status(503).json({
      message: "Nie udało się wysłać kodu. Spróbuj ponownie za chwilę.",
    });
  }

  return res.status(200).json({ ok: true });
}

function bodyEmail(body: Body | undefined): string | null {
  const raw = body?.email?.trim().toLowerCase();
  if (!raw || !raw.includes("@")) return null;
  return raw;
}
