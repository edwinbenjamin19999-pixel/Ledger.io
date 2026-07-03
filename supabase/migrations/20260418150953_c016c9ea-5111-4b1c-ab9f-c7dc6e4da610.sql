-- 1. Sync log for observability
CREATE TABLE IF NOT EXISTS public.bank_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  bank_account_id uuid,
  status text NOT NULL CHECK (status IN ('success','partial','failed')),
  transactions_added integer DEFAULT 0,
  error_message text,
  duration_ms integer,
  synced_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bank_sync_log_company ON public.bank_sync_log(company_id, synced_at DESC);
CREATE INDEX IF NOT EXISTS idx_bank_sync_log_account ON public.bank_sync_log(bank_account_id, synced_at DESC);

ALTER TABLE public.bank_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view sync logs"
ON public.bank_sync_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.company_id = bank_sync_log.company_id
  )
);

-- 2. Extend company_bank_sync_status with health
ALTER TABLE public.company_bank_sync_status
  ADD COLUMN IF NOT EXISTS connection_status text DEFAULT 'healthy' CHECK (connection_status IN ('healthy','degraded','failed','unknown')),
  ADD COLUMN IF NOT EXISTS last_error_message text,
  ADD COLUMN IF NOT EXISTS consecutive_failures integer DEFAULT 0;

-- 3. Enable Realtime
ALTER TABLE public.bank_transactions REPLICA IDENTITY FULL;
ALTER TABLE public.bank_accounts REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bank_transactions;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bank_accounts;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;