import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type { ReturnStatus } from "../../../types/moduly";
import type ReturnsModuleService from "../../../modules/returns/service";
import { RETURNS_MODULE } from "../../../modules/returns/service";

/**
 * GET /admin/returns — lista wniosków zwrotowych / reklamacyjnych.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const limit = parsePositiveInt(req.query.limit, 50);
  const offset = parsePositiveInt(req.query.offset, 0);
  const status = parseReturnStatus(req.query.status);

  const returns = req.scope.resolve(RETURNS_MODULE) as ReturnsModuleService;
  const rows = await returns.listReturns({ limit, offset, status });

  return res.status(200).json({ returns: rows, limit, offset });
}

function parsePositiveInt(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

function parseReturnStatus(value: unknown): ReturnStatus | undefined {
  if (typeof value !== "string") return undefined;
  const allowed: ReturnStatus[] = [
    "pending_approval",
    "approved",
    "shipped",
    "received",
    "refunded",
    "rejected",
    "canceled",
  ];
  return allowed.includes(value as ReturnStatus)
    ? (value as ReturnStatus)
    : undefined;
}
