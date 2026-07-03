
-- AI account-level forecast suggestions cache
CREATE TABLE IF NOT EXISTS public.ai_account_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  period_hash TEXT NOT NULL,
  account_number TEXT NOT NULL,
  suggested_value NUMERIC NOT NULL,
  reason TEXT,
  expected_impact_sek NUMERIC,
  confidence NUMERIC DEFAULT 0.7,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '6 hours'),
  UNIQUE(company_id, period_hash, account_number)
);

CREATE INDEX IF NOT EXISTS idx_ai_acc_sugg_lookup ON public.ai_account_suggestions(company_id, period_hash, expires_at);

ALTER TABLE public.ai_account_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read account suggestions for their companies"
  ON public.ai_account_suggestions FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Service inserts account suggestions"
  ON public.ai_account_suggestions FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Service updates account suggestions"
  ON public.ai_account_suggestions FOR UPDATE TO authenticated
  USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

-- Audit trail for forecast adjustments (manual + AI-assisted)
CREATE TABLE IF NOT EXISTS public.forecast_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  budget_id UUID REFERENCES public.budget_plans(id) ON DELETE SET NULL,
  account_number TEXT NOT NULL,
  period_month TEXT NOT NULL,
  prior_value NUMERIC,
  new_value NUMERIC NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('manual','ai','reset')),
  ai_suggestion_id UUID REFERENCES public.ai_account_suggestions(id) ON DELETE SET NULL,
  reasoning TEXT,
  applied_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  undone_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_forecast_adjustments_company ON public.forecast_adjustments(company_id, account_number, period_month);
CREATE INDEX IF NOT EXISTS idx_forecast_adjustments_recent ON public.forecast_adjustments(company_id, applied_at DESC);

ALTER TABLE public.forecast_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read forecast adjustments for their companies"
  ON public.forecast_adjustments FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert forecast adjustments for their companies"
  ON public.forecast_adjustments FOR INSERT TO authenticated
  WITH CHECK (
    company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid())
    AND applied_by = auth.uid()
  );

CREATE POLICY "Users can update (undo) their own forecast adjustments"
  ON public.forecast_adjustments FOR UPDATE TO authenticated
  USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));
