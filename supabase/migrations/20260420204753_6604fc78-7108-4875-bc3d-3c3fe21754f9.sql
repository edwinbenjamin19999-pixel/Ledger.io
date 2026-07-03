CREATE TABLE public.budget_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  budget_id UUID REFERENCES public.budget_plans(id) ON DELETE CASCADE,
  kpi TEXT NOT NULL CHECK (kpi IN ('ebit','revenue','cash','runway')),
  target_value NUMERIC NOT NULL,
  target_period TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_budget_targets_company ON public.budget_targets(company_id);
CREATE INDEX idx_budget_targets_budget ON public.budget_targets(budget_id);

ALTER TABLE public.budget_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view budget_targets"
  ON public.budget_targets FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Company members can manage budget_targets"
  ON public.budget_targets FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE TABLE public.budget_rolling_forecasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  budget_id UUID NOT NULL REFERENCES public.budget_plans(id) ON DELETE CASCADE,
  fiscal_year INT NOT NULL,
  drivers_hash TEXT,
  latest_actual_date DATE,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT budget_rolling_forecasts_budget_unique UNIQUE (budget_id)
);

CREATE INDEX idx_brf_company ON public.budget_rolling_forecasts(company_id);

ALTER TABLE public.budget_rolling_forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view rolling_forecasts"
  ON public.budget_rolling_forecasts FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Service role manages rolling_forecasts"
  ON public.budget_rolling_forecasts FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');