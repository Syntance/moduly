import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type FormsModuleService from "../../../../../modules/forms/service";
import { FORMS_MODULE } from "../../../../../modules/forms/service";

/**
 * GET /admin/forms/submissions/:id
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const id = req.params.id?.trim();
  if (!id) {
    return res.status(400).json({ message: "Brak identyfikatora zgłoszenia." });
  }

  const forms = req.scope.resolve(FORMS_MODULE) as FormsModuleService;
  const submission = await forms.getSubmission(id);
  if (!submission) {
    return res.status(404).json({ message: "Nie znaleziono zgłoszenia." });
  }

  return res.status(200).json({ submission });
}
