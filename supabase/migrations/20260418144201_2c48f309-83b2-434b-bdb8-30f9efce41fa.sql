
-- 1. Extend automation_settings with strategic system definition fields
ALTER TABLE public.automation_settings
  ADD COLUMN IF NOT EXISTS system_mission text,
  ADD COLUMN IF NOT EXISTS system_priorities jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS system_boundaries jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS escalation_destination text,
  ADD COLUMN IF NOT EXISTS confidence_floor numeric DEFAULT 0.85,
  ADD COLUMN IF NOT EXISTS audit_mode boolean DEFAULT false;

-- 2. Create ai_agent_registry
CREATE TABLE IF NOT EXISTS public.ai_agent_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  agent_key text NOT NULL,
  name text NOT NULL,
  mission text,
  owned_modules text[] DEFAULT ARRAY[]::text[],
  triggers text[] DEFAULT ARRAY[]::text[],
  data_inputs text[] DEFAULT ARRAY[]::text[],
  allowed_actions text[] DEFAULT ARRAY[]::text[],
  confidence_threshold numeric DEFAULT 0.85,
  escalation_policy jsonb DEFAULT '{}'::jsonb,
  review_required boolean DEFAULT false,
  is_paused boolean NOT NULL DEFAULT false,
  last_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, agent_key)
);

CREATE INDEX IF NOT EXISTS idx_ai_agent_registry_company ON public.ai_agent_registry(company_id);

ALTER TABLE public.ai_agent_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view agent registry" ON public.ai_agent_registry;
CREATE POLICY "Members can view agent registry"
  ON public.ai_agent_registry FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin'::app_role, company_id)
    OR public.has_role(auth.uid(), 'accountant'::app_role, company_id)
    OR public.has_role(auth.uid(), 'owner'::app_role, company_id)
  );

DROP POLICY IF EXISTS "Members can insert agent registry" ON public.ai_agent_registry;
CREATE POLICY "Members can insert agent registry"
  ON public.ai_agent_registry FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role, company_id)
    OR public.has_role(auth.uid(), 'accountant'::app_role, company_id)
    OR public.has_role(auth.uid(), 'owner'::app_role, company_id)
  );

DROP POLICY IF EXISTS "Members can update agent registry" ON public.ai_agent_registry;
CREATE POLICY "Members can update agent registry"
  ON public.ai_agent_registry FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'admin'::app_role, company_id)
    OR public.has_role(auth.uid(), 'accountant'::app_role, company_id)
    OR public.has_role(auth.uid(), 'owner'::app_role, company_id)
  );

DROP POLICY IF EXISTS "Members can delete agent registry" ON public.ai_agent_registry;
CREATE POLICY "Members can delete agent registry"
  ON public.ai_agent_registry FOR DELETE
  USING (
    public.has_role(auth.uid(), 'admin'::app_role, company_id)
    OR public.has_role(auth.uid(), 'owner'::app_role, company_id)
  );

-- updated_at trigger
DROP TRIGGER IF EXISTS update_ai_agent_registry_updated_at ON public.ai_agent_registry;
CREATE TRIGGER update_ai_agent_registry_updated_at
  BEFORE UPDATE ON public.ai_agent_registry
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Seed function for default agents
CREATE OR REPLACE FUNCTION public.seed_default_ai_agents(p_company_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  INSERT INTO public.ai_agent_registry (company_id, agent_key, name, mission, owned_modules, triggers, allowed_actions, confidence_threshold, review_required)
  VALUES
    (p_company_id, 'ai_cfo', 'AI CFO', 'Strategisk finansiell analys, variansförklaring och rådgivning', ARRAY['financial-analysis','reports','cfo'], ARRAY['budget_variance','margin_drop','cashflow_risk'], ARRAY['generate_insight','suggest_action'], 0.80, false),
    (p_company_id, 'bookkeeping_agent', 'Autonom Bokföringsagent', 'Automatisk kontering av leverantörsfakturor och banktransaktioner', ARRAY['accounting','verifikationer','bankintegration'], ARRAY['document_uploaded','bank_transaction_imported'], ARRAY['post_journal','suggest_account','flag_review'], 0.95, true),
    (p_company_id, 'vat_engine', 'VAT Engine', 'Förbereder och validerar momsdeklarationer (SKV 4700)', ARRAY['vat','moms'], ARRAY['vat_deadline_approaching','vat_mismatch_detected'], ARRAY['prepare_declaration','validate_codes'], 0.90, true),
    (p_company_id, 'ar_controller', 'AR Controller', 'Bevakar kundfordringar, DSO och kundkoncentration', ARRAY['ar-agent','finance','invoices'], ARRAY['receivable_overdue','dso_increase','concentration_risk'], ARRAY['send_reminder','suggest_collection','flag_risk'], 0.85, false),
    (p_company_id, 'cashflow_analyst', 'Cashflow Analyst', '12-månaders likviditetsprognos och scenarioanalys', ARRAY['cashflow-forecast','treasury'], ARRAY['runway_below_threshold','negative_cashflow_forecast'], ARRAY['generate_forecast','warn_liquidity'], 0.80, false),
    (p_company_id, 'document_intelligence', 'Document Intelligence', 'Extraherar strukturerad data från PDF, kvitton, kontrakt', ARRAY['dokument','expenses'], ARRAY['document_uploaded','email_received'], ARRAY['extract_fields','classify_document'], 0.85, false),
    (p_company_id, 'payroll_monitor', 'Payroll Monitor', 'Övervakar löneunderlag, AGI och avvikelser i lönekostnader', ARRAY['hr','agi','payroll'], ARRAY['payroll_deviation','agi_deadline'], ARRAY['prepare_agi','flag_anomaly'], 0.90, true),
    (p_company_id, 'whitelabel_advisor', 'White Label Advisor', 'Tenant-konfigurerad rådgivare för partnerbyråer', ARRAY['white-label','tenant'], ARRAY['tenant_rule_fired','client_facing_event'], ARRAY['surface_branded_insight'], 0.85, false)
  ON CONFLICT (company_id, agent_key) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- 4. Auto-seed agents on new company
CREATE OR REPLACE FUNCTION public.trigger_seed_ai_agents()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_default_ai_agents(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS seed_ai_agents_on_company_insert ON public.companies;
CREATE TRIGGER seed_ai_agents_on_company_insert
  AFTER INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.trigger_seed_ai_agents();
