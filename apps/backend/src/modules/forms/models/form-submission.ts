import { model } from "@medusajs/framework/utils";

const FormSubmission = model.define("form_submission", {
  id: model.id().primaryKey(),
  form_id: model.text(),
  form_slug: model.text(),
  fields: model.json(),
  ip_hash: model.text().nullable(),
  user_agent: model.text().nullable(),
});

export default FormSubmission;
