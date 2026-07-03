
-- Add 'credited' and 'attested' to invoice_status enum
ALTER TYPE public.invoice_status ADD VALUE IF NOT EXISTS 'credited';
ALTER TYPE public.invoice_status ADD VALUE IF NOT EXISTS 'attested';

-- Add attested_by and attested_at columns to invoices
ALTER TABLE public.invoices 
  ADD COLUMN IF NOT EXISTS attested_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS attested_at timestamptz,
  ADD COLUMN IF NOT EXISTS attest_comment text,
  ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.suppliers(id),
  ADD COLUMN IF NOT EXISTS cost_center_id uuid REFERENCES public.cost_centers(id),
  ADD COLUMN IF NOT EXISTS notes text;
