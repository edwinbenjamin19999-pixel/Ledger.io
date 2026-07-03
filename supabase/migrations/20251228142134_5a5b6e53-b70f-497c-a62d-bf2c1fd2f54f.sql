-- Create company-level sync status tracking for complete isolation
CREATE TABLE IF NOT EXISTS public.company_bank_sync_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  last_sync_started_at timestamptz,
  last_sync_completed_at timestamptz,
  sync_status text NOT NULL DEFAULT 'idle', -- idle, syncing, error, completed
  error_message text,
  accounts_synced integer DEFAULT 0,
  transactions_synced integer DEFAULT 0,
  next_scheduled_sync timestamptz,
  sync_interval_minutes integer DEFAULT 60,
  is_enabled boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

-- Enable RLS
ALTER TABLE public.company_bank_sync_status ENABLE ROW LEVEL SECURITY;

-- RLS policies - each company can only see their own sync status
CREATE POLICY "Users can view own company sync status"
  ON public.company_bank_sync_status
  FOR SELECT
  USING (has_company_access(auth.uid(), company_id));

CREATE POLICY "Owners can manage sync status"
  ON public.company_bank_sync_status
  FOR ALL
  USING (has_company_access(auth.uid(), company_id) AND has_role(auth.uid(), 'owner'::app_role));

-- Service role can manage all (for edge functions)
CREATE POLICY "Service role full access"
  ON public.company_bank_sync_status
  FOR ALL
  USING (auth.role() = 'service_role');

-- Index for finding companies that need sync
CREATE INDEX idx_company_sync_next_scheduled 
  ON public.company_bank_sync_status(next_scheduled_sync, is_enabled) 
  WHERE is_enabled = true AND sync_status != 'syncing';

-- Index for company lookup
CREATE INDEX idx_company_sync_company_id ON public.company_bank_sync_status(company_id);

-- Trigger to auto-create sync status when bank account is first linked
CREATE OR REPLACE FUNCTION public.create_company_sync_status()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.company_bank_sync_status (company_id, next_scheduled_sync)
  VALUES (NEW.company_id, now())
  ON CONFLICT (company_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_bank_account_created
  AFTER INSERT ON public.bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.create_company_sync_status();