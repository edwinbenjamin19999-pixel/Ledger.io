
-- Budget plans (replaces simple budgets for the new engine)
CREATE TABLE public.budget_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  fiscal_year INTEGER NOT NULL,
  name TEXT NOT NULL DEFAULT 'Budget',
  scenario_type TEXT NOT NULL DEFAULT 'base' CHECK (scenario_type IN ('base','optimistic','pessimistic','custom')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','approved','locked')),
  creation_method TEXT DEFAULT 'manual' CHECK (creation_method IN ('ai','historical','manual')),
  created_by UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  ai_assumptions JSONB DEFAULT '{}',
  growth_rate NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, fiscal_year, scenario_type)
);

ALTER TABLE public.budget_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage budget_plans for their companies"
  ON public.budget_plans FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

-- Budget rows (monthly values per account)
CREATE TABLE public.budget_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES public.budget_plans(id) ON DELETE CASCADE,
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  jan NUMERIC NOT NULL DEFAULT 0,
  feb NUMERIC NOT NULL DEFAULT 0,
  mar NUMERIC NOT NULL DEFAULT 0,
  apr NUMERIC NOT NULL DEFAULT 0,
  maj NUMERIC NOT NULL DEFAULT 0,
  jun NUMERIC NOT NULL DEFAULT 0,
  jul NUMERIC NOT NULL DEFAULT 0,
  aug NUMERIC NOT NULL DEFAULT 0,
  sep NUMERIC NOT NULL DEFAULT 0,
  okt NUMERIC NOT NULL DEFAULT 0,
  nov NUMERIC NOT NULL DEFAULT 0,
  "dec" NUMERIC NOT NULL DEFAULT 0,
  annual_total NUMERIC GENERATED ALWAYS AS (jan+feb+mar+apr+maj+jun+jul+aug+sep+okt+nov+"dec") STORED,
  notes TEXT,
  ai_generated BOOLEAN DEFAULT false,
  manually_adjusted BOOLEAN DEFAULT false,
  last_updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(budget_id, account_number)
);

ALTER TABLE public.budget_rows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage budget_rows via budget_plans"
  ON public.budget_rows FOR ALL TO authenticated
  USING (budget_id IN (
    SELECT id FROM public.budget_plans WHERE company_id IN (
      SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  ))
  WITH CHECK (budget_id IN (
    SELECT id FROM public.budget_plans WHERE company_id IN (
      SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  ));

-- Budget forecasts (rolling forecast per month)
CREATE TABLE public.budget_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES public.budget_plans(id) ON DELETE CASCADE,
  month TEXT NOT NULL, -- YYYY-MM
  account_number TEXT NOT NULL,
  forecast_amount NUMERIC NOT NULL DEFAULT 0,
  actual_amount NUMERIC,
  variance NUMERIC,
  variance_pct NUMERIC,
  ai_explanation TEXT,
  forecast_generated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(budget_id, month, account_number)
);

ALTER TABLE public.budget_forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage budget_forecasts via budget_plans"
  ON public.budget_forecasts FOR ALL TO authenticated
  USING (budget_id IN (
    SELECT id FROM public.budget_plans WHERE company_id IN (
      SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  ))
  WITH CHECK (budget_id IN (
    SELECT id FROM public.budget_plans WHERE company_id IN (
      SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()
    )
  ));

-- Indexes
CREATE INDEX idx_budget_plans_company ON public.budget_plans(company_id, fiscal_year);
CREATE INDEX idx_budget_rows_budget ON public.budget_rows(budget_id);
CREATE INDEX idx_budget_forecasts_budget ON public.budget_forecasts(budget_id, month);
