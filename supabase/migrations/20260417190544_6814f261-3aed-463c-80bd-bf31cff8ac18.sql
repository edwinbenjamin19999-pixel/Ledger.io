CREATE TABLE IF NOT EXISTS public.staff_cost_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  period_month date NOT NULL,
  total_hours numeric NOT NULL DEFAULT 0,
  total_cost numeric NOT NULL DEFAULT 0,
  scheduled_cost numeric,
  actual_cost numeric,
  source text NOT NULL DEFAULT 'manual',
  imported_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, period_month, source)
);

ALTER TABLE public.staff_cost_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can manage staff_cost_imports" ON public.staff_cost_imports
  FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_staff_cost_imports_company_period
  ON public.staff_cost_imports(company_id, period_month DESC);