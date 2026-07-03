-- Add UNIQUE constraint on bank_connection_id so ON CONFLICT works in handle-bank-callback
-- First clear potential duplicates (keep newest)
DELETE FROM public.bank_accounts a
USING public.bank_accounts b
WHERE a.bank_connection_id = b.bank_connection_id
  AND a.bank_connection_id IS NOT NULL
  AND a.created_at < b.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS bank_accounts_bank_connection_id_key
  ON public.bank_accounts (bank_connection_id)
  WHERE bank_connection_id IS NOT NULL;