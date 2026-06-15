import { model } from "@medusajs/framework/utils";

const ReturnRequest = model.define("return_request", {
  id: model.id().primaryKey(),
  request_type: model.text(),
  order_id: model.text(),
  order_display_id: model.number(),
  customer_email: model.text(),
  status: model.text().default("pending_approval"),
  reason: model.text(),
  claim_remedy: model.text().nullable(),
  claim_reference_id: model.text().nullable(),
  items: model.json(),
  total_to_refund: model.number(),
  approved_at: model.dateTime().nullable(),
  shipped_at: model.dateTime().nullable(),
  received_at: model.dateTime().nullable(),
  refunded_at: model.dateTime().nullable(),
  rejected_at: model.dateTime().nullable(),
  rejection_reason: model.text().nullable(),
  admin_notes: model.text().nullable(),
});

export default ReturnRequest;
