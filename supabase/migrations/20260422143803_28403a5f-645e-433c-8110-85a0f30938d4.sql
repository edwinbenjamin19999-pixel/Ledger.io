-- Add rejection + multi-step approval fields to invoices
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_by uuid,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS approval_step integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_approver_email text;

-- Add 'rejected' to invoice_status enum if it exists as enum, otherwise no-op
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'invoice_status' AND e.enumlabel = 'rejected'
    ) THEN
      ALTER TYPE public.invoice_status ADD VALUE 'rejected';
    END IF;
  END IF;
END $$;