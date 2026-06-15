-- @moduly/data-store migration 0002 — formularze kontaktowe + rozszerzone zwroty

CREATE TABLE IF NOT EXISTS contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number TEXT NOT NULL,
  form_preset TEXT NOT NULL,
  form_name TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  topic TEXT NOT NULL,
  topic_label TEXT NOT NULL,
  topic_other TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS contact_submissions_created_at_idx ON contact_submissions(created_at);
CREATE INDEX IF NOT EXISTS contact_submissions_customer_email_idx ON contact_submissions(customer_email);
CREATE UNIQUE INDEX IF NOT EXISTS contact_submissions_case_number_idx ON contact_submissions(case_number);

CREATE TABLE IF NOT EXISTS counters (
  key TEXT PRIMARY KEY,
  year INTEGER NOT NULL,
  value INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE return_requests
  ADD COLUMN IF NOT EXISTS claim_reference_id TEXT,
  ADD COLUMN IF NOT EXISTS total_to_refund INTEGER,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

ALTER TABLE return_line_items
  ADD COLUMN IF NOT EXISTS unit_price INTEGER,
  ADD COLUMN IF NOT EXISTS thumbnail TEXT;

CREATE INDEX IF NOT EXISTS return_requests_order_id_idx ON return_requests(order_id);
