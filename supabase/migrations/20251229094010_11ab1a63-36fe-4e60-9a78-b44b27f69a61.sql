-- Add payment tracking fields to journal_entries
ALTER TABLE public.journal_entries
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'not_applicable',
ADD COLUMN IF NOT EXISTS payment_initiated_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS payment_completed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS payment_reference text,
ADD COLUMN IF NOT EXISTS supplier_iban text,
ADD COLUMN IF NOT EXISTS supplier_name text;

-- Add document_category to distinguish receipts from invoices
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS document_category text DEFAULT 'receipt';

-- Add comment explaining the payment_status values
COMMENT ON COLUMN public.journal_entries.payment_status IS 'Values: not_applicable (receipt/already paid), pending_payment (awaiting bank transfer), payment_initiated (sent to bank), payment_completed (confirmed by bank), payment_failed';

COMMENT ON COLUMN public.documents.document_category IS 'Values: receipt (already paid), supplier_invoice (needs payment), customer_invoice (receivable)';