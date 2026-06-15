import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type { CreateReturnInput } from "../../../../../types/moduly";
import type ReturnsModuleService from "../../../../../modules/returns/service";
import { RETURNS_MODULE } from "../../../../../modules/returns/service";

type Body = Partial<CreateReturnInput>;

/**
 * POST /store/custom/returns/create
 * Wniosek o odstąpienie od umowy (14 dni) — requestType: withdrawal.
 */
export async function POST(req: MedusaRequest<Body>, res: MedusaResponse) {
  const body = req.body ?? {};
  const input = validateCreateReturnBody(body, "withdrawal");
  if ("error" in input) {
    return res.status(400).json({ message: input.error });
  }

  const returns = req.scope.resolve(RETURNS_MODULE) as ReturnsModuleService;

  const active = await returns.getActiveWithdrawalForOrder(input.orderId);
  if (active) {
    return res.status(409).json({
      message: "Dla tego zamówienia istnieje już aktywny wniosek o odstąpienie.",
      return_id: active.id,
    });
  }

  const created = await returns.createReturn(input);
  return res.status(201).json({ return: created });
}

export function validateCreateReturnBody(
  body: Partial<CreateReturnInput>,
  requestType: CreateReturnInput["requestType"],
): CreateReturnInput | { error: string } {
  const orderId = body.orderId?.trim();
  const customerEmail = body.customerEmail?.trim().toLowerCase();
  const reason = body.reason?.trim();
  const items = Array.isArray(body.items) ? body.items : [];
  const orderDisplayId = body.orderDisplayId;
  const totalToRefund = body.totalToRefund;

  if (
    !orderId ||
    !customerEmail ||
    !reason ||
    orderDisplayId == null ||
    totalToRefund == null
  ) {
    return {
      error:
        "orderId, orderDisplayId, customerEmail, reason, totalToRefund oraz items są wymagane.",
    };
  }

  if (items.length === 0) {
    return { error: "Wybierz co najmniej jedną pozycję." };
  }

  return {
    requestType,
    orderId,
    orderDisplayId,
    customerEmail,
    reason,
    items,
    totalToRefund,
    claimRemedy: body.claimRemedy ?? null,
    claimReferenceId: body.claimReferenceId ?? null,
  };
}
