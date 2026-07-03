-- Delete bank transactions tied to sandbox accounts
DELETE FROM public.bank_transactions
WHERE bank_account_id IN (
  SELECT id FROM public.bank_accounts
  WHERE iban LIKE 'SE%0000000000%'
     OR account_name ILIKE '%sandbox%'
     OR bank_name ILIKE '%sandbox%'
     OR bank_name ILIKE '%mock%'
);

-- Close related bank_connections (table-existence guarded)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='bank_connections') THEN
    UPDATE public.bank_connections
    SET status = 'closed', updated_at = now()
    WHERE id IN (
      SELECT DISTINCT bank_connection_id
      FROM public.bank_accounts
      WHERE (iban LIKE 'SE%0000000000%' OR account_name ILIKE '%sandbox%' OR bank_name ILIKE '%mock%')
        AND bank_connection_id IS NOT NULL
    );
  END IF;
END $$;

-- Delete the sandbox bank accounts themselves
DELETE FROM public.bank_accounts
WHERE iban LIKE 'SE%0000000000%'
   OR account_name ILIKE '%sandbox%'
   OR bank_name ILIKE '%sandbox%'
   OR bank_name ILIKE '%mock%';

-- Clean up related sandbox-driven notifications from the last 7 days
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='bank_notifications') THEN
    DELETE FROM public.bank_notifications
    WHERE created_at > now() - interval '7 days'
      AND (title ILIKE 'Ny transaktion%' OR message ILIKE '%okänd motpart%');
  END IF;
END $$;