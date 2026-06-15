import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { getCustomerOtpAuth } from "../../../../../lib/customer-auth";
import { createMedusaCookieAdapter } from "../../../../../lib/medusa-cookies";

/**
 * GET /store/custom/customer/orders
 * Lista zamówień zalogowanego klienta (sesja OTP).
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const auth = getCustomerOtpAuth();
  const cookies = createMedusaCookieAdapter(req, res);
  const session = await auth.validateCustomerSession(cookies);

  if (!session) {
    return res.status(401).json({ message: "Sesja wygasła — zaloguj się ponownie." });
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as {
    graph: (args: unknown) => Promise<{ data: unknown[] }>;
  };

  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "status",
      "email",
      "created_at",
      "total",
      "currency_code",
      "items.id",
      "items.title",
      "items.quantity",
      "items.unit_price",
    ],
    filters: { email: session.email },
    pagination: { take: 50, order: { created_at: "DESC" } },
  });

  return res.status(200).json({ orders });
}
