import type {
  CreateFormSubmissionInput,
  FormSubmission,
  ListSubmissionsOptions,
} from "../../types/moduly";
import { MedusaService } from "@medusajs/framework/utils";
import FormSubmissionModel from "./models/form-submission";

export const FORMS_MODULE = "forms";

type SubmissionRecord = {
  id: string;
  form_id: string;
  form_slug: string;
  fields: Record<string, string | boolean>;
  ip_hash?: string | null;
  user_agent?: string | null;
  created_at?: string | Date;
};

function mapRecord(row: SubmissionRecord): FormSubmission {
  return {
    id: row.id,
    formId: row.form_id,
    formSlug: row.form_slug,
    fields: row.fields ?? {},
    ipHash: row.ip_hash ?? undefined,
    userAgent: row.user_agent ?? undefined,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at ?? new Date().toISOString()),
  };
}

export default class FormsModuleService extends MedusaService({
  FormSubmission: FormSubmissionModel,
}) {
  async createSubmission(
    input: CreateFormSubmissionInput,
  ): Promise<FormSubmission> {
    const created = await this.createFormSubmissions({
      form_id: input.formId,
      form_slug: input.formSlug,
      fields: input.fields,
      ip_hash: input.ipHash ?? null,
      user_agent: input.userAgent ?? null,
    });

    return mapRecord(created as SubmissionRecord);
  }

  async listSubmissions(
    formId: string,
    options: ListSubmissionsOptions = {},
  ): Promise<FormSubmission[]> {
    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;

    const rows = await this.listFormSubmissions(
      { form_id: formId },
      {
        take: limit,
        skip: offset,
        order: { created_at: "DESC" },
      },
    );

    return (rows as SubmissionRecord[]).map(mapRecord);
  }

  async listAllSubmissions(
    options: ListSubmissionsOptions = {},
  ): Promise<FormSubmission[]> {
    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;

    const rows = await this.listFormSubmissions(
      {},
      {
        take: limit,
        skip: offset,
        order: { created_at: "DESC" },
      },
    );

    return (rows as SubmissionRecord[]).map(mapRecord);
  }

  async getSubmission(submissionId: string): Promise<FormSubmission | null> {
    const row = await this.retrieveFormSubmission(submissionId).catch(() => null);
    if (!row) return null;
    return mapRecord(row as SubmissionRecord);
  }
}
