import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { getCustomerOtpAuth } from "../../../../../lib/customer-auth";
import { createMedusaCookieAdapter } from "../../../../../lib/medusa-cookies";

type Body = { email?: string; code?: string };

/**
 * POST /store/custom/customer/verify-otp
 * Weryfikuje OTP i ustawia sesję klienta (httpOnly cookie).
 */
export async function POST(req: MedusaRequest<Body>, res: MedusaResponse) {
  const email = req.body?.email?.trim().toLowerCase();
  const code = req.body?.code?.trim();

  if (!email || !code) {
    return res.status(400).json({
      message: "Adres e-mail i kod są wymagane.",
    });
  }

  const auth = getCustomerOtpAuth();
  const cookies = createMedusaCookieAdapter(req, res);

  try {
    const session = await auth.verifyOtpAndIssueSession(email, code, cookies);
    return res.status(200).json({
      ok: true,
      email: session.email,
      expires_at: session.expiresAt,
    });
  } catch (e) {
    return res.status(401).json({
      message: (e as Error).message ?? "Nie udało się zweryfikować kodu.",
    });
  }
}
