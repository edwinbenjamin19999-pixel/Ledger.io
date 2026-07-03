-- forecast_locks: freeze a specific forecast cell
CREATE TABLE public.forecast_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  budget_id uuid REFERENCES public.budgets(id) ON DELETE CASCADE,
  account_number text NOT NULL,
  period_month date NOT NULL,
  locked_value numeric NOT NULL,
  locked_at timestamptz NOT NULL DEFAULT now(),
  locked_by uuid REFERENCES auth.users(id),
  note text,
  UNIQUE (company_id, budget_id, account_number, period_month)
);

CREATE INDEX idx_forecast_locks_company ON public.forecast_locks(company_id);
CREATE INDEX idx_forecast_locks_budget ON public.forecast_locks(budget_id);

ALTER TABLE public.forecast_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view forecast_locks for their company"
  ON public.forecast_locks FOR SELECT
  USING (public.has_company_access(auth.uid(), company_id));

CREATE POLICY "Users insert forecast_locks for their company"
  ON public.forecast_locks FOR INSERT
  WITH CHECK (
    public.has_company_access(auth.uid(), company_id)
    AND (
      public.has_role(auth.uid(), 'owner'::app_role, company_id)
      OR public.has_role(auth.uid(), 'accountant'::app_role, company_id)
    )
  );

CREATE POLICY "Users update forecast_locks for their company"
  ON public.forecast_locks FOR UPDATE
  USING (
    public.has_company_access(auth.uid(), company_id)
    AND (
      public.has_role(auth.uid(), 'owner'::app_role, company_id)
      OR public.has_role(auth.uid(), 'accountant'::app_role, company_id)
    )
  );

CREATE POLICY "Users delete forecast_locks for their company"
  ON public.forecast_locks FOR DELETE
  USING (
    public.has_company_access(auth.uid(), company_id)
    AND (
      public.has_role(auth.uid(), 'owner'::app_role, company_id)
      OR public.has_role(auth.uid(), 'accountant'::app_role, company_id)
    )
  );

-- forecast_confidence_history: append-only audit trail
CREATE TABLE public.forecast_confidence_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  budget_id uuid REFERENCES public.budgets(id) ON DELETE CASCADE,
  computed_at timestamptz NOT NULL DEFAULT now(),
  overall_score numeric NOT NULL,
  level text NOT NULL,
  components jsonb NOT NULL DEFAULT '{}'::jsonb,
  drivers jsonb NOT NULL DEFAULT '{}'::jsonb,
  weak_signals jsonb NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX idx_confidence_history_company_time
  ON public.forecast_confidence_history(company_id, computed_at DESC);
CREATE INDEX idx_confidence_history_budget_time
  ON public.forecast_confidence_history(budget_id, computed_at DESC);

ALTER TABLE public.forecast_confidence_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view confidence history for their company"
  ON public.forecast_confidence_history FOR SELECT
  USING (public.has_company_access(auth.uid(), company_id));

CREATE POLICY "Users insert confidence history for their company"
  ON public.forecast_confidence_history FOR INSERT
  WITH CHECK (public.has_company_access(auth.uid(), company_id));

CREATE POLICY "Service role can manage confidence history"
  ON public.forecast_confidence_history FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');