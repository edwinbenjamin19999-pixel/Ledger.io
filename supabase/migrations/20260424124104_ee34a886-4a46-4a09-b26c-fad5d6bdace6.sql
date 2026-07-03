-- Phase 1: Supplier Payments — provider abstraction, status taxonomy, audit log

-- 1. Payment providers (per company)
CREATE TABLE IF NOT EXISTS public.payment_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider_type text NOT NULL CHECK (provider_type IN ('file_export','open_banking')),
  provider_name text NOT NULL CHECK (provider_name IN ('manual_file_export','salt_edge','tink','truelayer','yapily')),
  display_name text NOT NULL,
  supports_account_information boolean NOT NULL DEFAULT false,
  supports_payment_initiation boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'inactive' CHECK (status IN ('inactive','sandbox','active')),
  credentials_ref text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, provider_name)
);

CREATE INDEX IF NOT EXISTS idx_payment_providers_company ON public.payment_providers(company_id);

ALTER TABLE public.payment_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view providers in own companies" ON public.payment_providers
  FOR SELECT TO authenticated
  USING (company_id IN (SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid()));

CREATE POLICY "manage providers in own companies" ON public.payment_providers
  FOR ALL TO authenticated
  USING (company_id IN (SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid()));

-- 2. Extend payment_proposals with provider + new status taxonomy + reconciliation
ALTER TABLE public.payment_proposals
  ADD COLUMN IF NOT EXISTS provider_type text NOT NULL DEFAULT 'file_export'
    CHECK (provider_type IN ('file_export','open_banking')),
  ADD COLUMN IF NOT EXISTS provider_name text NOT NULL DEFAULT 'manual_file_export'
    CHECK (provider_name IN ('manual_file_export','salt_edge','tink','truelayer','yapily')),
  ADD COLUMN IF NOT EXISTS external_provider_reference text,
  ADD COLUMN IF NOT EXISTS bank_approval_status text NOT NULL DEFAULT 'not_sent'
    CHECK (bank_approval_status IN ('not_sent','awaiting_approval','approved','rejected')),
  ADD COLUMN IF NOT EXISTS reconciliation_status text NOT NULL DEFAULT 'unreconciled'
    CHECK (reconciliation_status IN ('unreconciled','partially_matched','matched','manually_confirmed')),
  ADD COLUMN IF NOT EXISTS exported_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS failure_reason text;

-- Extend status check to include new values (drop & recreate)
ALTER TABLE public.payment_proposals DROP CONSTRAINT IF EXISTS payment_proposals_status_check;
ALTER TABLE public.payment_proposals ADD CONSTRAINT payment_proposals_status_check
  CHECK (status IN (
    'draft','pending_approval','approved_1','approved','rejected',
    'sent_to_bank','downloaded','completed',
    'ready_for_payment','exported_to_bank','awaiting_bank_approval','paid','failed'
  ));

-- 3. Status audit log
CREATE TABLE IF NOT EXISTS public.payment_status_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.payment_proposals(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  changed_by uuid NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  note text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_payment_status_log_proposal ON public.payment_status_log(proposal_id);
CREATE INDEX IF NOT EXISTS idx_payment_status_log_company ON public.payment_status_log(company_id);

ALTER TABLE public.payment_status_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view status log in own companies" ON public.payment_status_log
  FOR SELECT TO authenticated
  USING (company_id IN (SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid()));

CREATE POLICY "insert status log in own companies" ON public.payment_status_log
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid())
    AND changed_by = auth.uid()
  );

-- 4. Auto-seed manual_file_export provider for existing + future companies
INSERT INTO public.payment_providers (company_id, provider_type, provider_name, display_name, supports_account_information, supports_payment_initiation, status)
SELECT id, 'file_export', 'manual_file_export', 'Manuell filexport (ISO 20022)', false, false, 'active'
FROM public.companies
ON CONFLICT (company_id, provider_name) DO NOTHING;

CREATE OR REPLACE FUNCTION public.seed_default_payment_provider()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.payment_providers (company_id, provider_type, provider_name, display_name, supports_account_information, supports_payment_initiation, status)
  VALUES (NEW.id, 'file_export', 'manual_file_export', 'Manuell filexport (ISO 20022)', false, false, 'active')
  ON CONFLICT (company_id, provider_name) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_default_payment_provider ON public.companies;
CREATE TRIGGER trg_seed_default_payment_provider
  AFTER INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.seed_default_payment_provider();