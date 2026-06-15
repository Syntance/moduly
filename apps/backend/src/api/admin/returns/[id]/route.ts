import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type { ReturnStatus } from "../../../../types/moduly";
import type ReturnsModuleService from "../../../../modules/returns/service";
import { RETURNS_MODULE } from "../../../../modules/returns/service";

type PatchBody = {
  status?: ReturnStatus;
  admin_notes?: string;
  rejection_reason?: string;
};

/**
 * GET /admin/returns/:id
 * PATCH /admin/returns/:id
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const id = req.params.id?.trim();
  if (!id) {
    return res.status(400).json({ message: "Brak identyfikatora wniosku." });
  }

  const returns = req.scope.resolve(RETURNS_MODULE) as ReturnsModuleService;
  const row = await returns.getReturn(id);
  if (!row) {
    return res.status(404).json({ message: "Nie znaleziono wniosku." });
  }

  return res.status(200).json({ return: row });
}

export async function PATCH(req: MedusaRequest<PatchBody>, res: MedusaResponse) {
  const id = req.params.id?.trim();
  if (!id) {
    return res.status(400).json({ message: "Brak identyfikatora wniosku." });
  }

  const status = req.body?.status;
  if (!status) {
    return res.status(400).json({ message: "Pole status jest wymagane." });
  }

  const returns = req.scope.resolve(RETURNS_MODULE) as ReturnsModuleService;
  const existing = await returns.getReturn(id);
  if (!existing) {
    return res.status(404).json({ message: "Nie znaleziono wniosku." });
  }

  const updated = await returns.updateReturn(id, status, {
    adminNotes: req.body?.admin_notes,
    rejectionReason: req.body?.rejection_reason,
  });

  return res.status(200).json({ return: updated });
}
