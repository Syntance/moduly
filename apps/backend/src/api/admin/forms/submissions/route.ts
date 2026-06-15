import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type FormsModuleService from "../../../../modules/forms/service";
import { FORMS_MODULE } from "../../../../modules/forms/service";

/**
 * GET /admin/forms/submissions — lista zgłoszeń formularzy.
 * Query: form_id (opcjonalnie), limit, offset
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const limit = parsePositiveInt(req.query.limit, 50);
  const offset = parsePositiveInt(req.query.offset, 0);
  const formId =
    typeof req.query.form_id === "string" ? req.query.form_id.trim() : "";

  const forms = req.scope.resolve(FORMS_MODULE) as FormsModuleService;
  const submissions = formId
    ? await forms.listSubmissions(formId, { limit, offset })
    : await forms.listAllSubmissions({ limit, offset });

  return res.status(200).json({ submissions, limit, offset });
}

function parsePositiveInt(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}
