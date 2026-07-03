-- Replace partial unique index with a full unique constraint so ON CONFLICT works
DROP INDEX IF EXISTS public.bank_accounts_bank_connection_id_key;

ALTER TABLE public.bank_accounts
  ADD CONSTRAINT bank_accounts_bank_connection_id_unique
  UNIQUE (bank_connection_id);