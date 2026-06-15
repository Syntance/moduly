import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type ReturnsModuleService from "../../../../../modules/returns/service";
import { RETURNS_MODULE } from "../../../../../modules/returns/service";
import { validateCreateReturnBody } from "../../returns/create/route";

type Body = Parameters<typeof validateCreateReturnBody>[0];

/**
 * POST /store/custom/claims/create
 * Wniosek reklamacyjny — requestType: claim.
 */
export async function POST(req: MedusaRequest<Body>, res: MedusaResponse) {
  const body = req.body ?? {};
  const input = validateCreateReturnBody(body, "claim");
  if ("error" in input) {
    return res.status(400).json({ message: input.error });
  }

  if (!input.claimRemedy) {
    return res.status(400).json({
      message: "Pole claimRemedy jest wymagane dla reklamacji.",
    });
  }

  const returns = req.scope.resolve(RETURNS_MODULE) as ReturnsModuleService;

  const active = await returns.getActiveClaimForOrder(input.orderId);
  if (active) {
    return res.status(409).json({
      message: "Dla tego zamówienia istnieje już aktywna reklamacja.",
      return_id: active.id,
    });
  }

  const created = await returns.createReturn(input);
  return res.status(201).json({ return: created });
}
