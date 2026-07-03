CREATE TABLE IF NOT EXISTS public.forecast_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  budget_id uuid REFERENCES public.budget_plans(id) ON DELETE SET NULL,
  fiscal_year integer NOT NULL,
  label text NOT NULL,
  kind text NOT NULL DEFAULT 'custom',
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  base_confidence numeric(5,2),
  parent_version_id uuid REFERENCES public.forecast_versions(id) ON DELETE SET NULL,
  locked_at timestamptz NOT NULL DEFAULT now(),
  locked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_forecast_versions_company ON public.forecast_versions(company_id);
CREATE INDEX IF NOT EXISTS idx_forecast_versions_budget ON public.forecast_versions(budget_id);
CREATE INDEX IF NOT EXISTS idx_forecast_versions_year ON public.forecast_versions(company_id, fiscal_year);

ALTER TABLE public.forecast_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fv_select" ON public.forecast_versions
  FOR SELECT TO authenticated
  USING (public.has_company_access(auth.uid(), company_id));

CREATE POLICY "fv_insert" ON public.forecast_versions
  FOR INSERT TO authenticated
  WITH CHECK (public.has_company_access(auth.uid(), company_id));

CREATE POLICY "fv_update" ON public.forecast_versions
  FOR UPDATE TO authenticated
  USING (public.has_company_access(auth.uid(), company_id))
  WITH CHECK (public.has_company_access(auth.uid(), company_id));

CREATE POLICY "fv_delete" ON public.forecast_versions
  FOR DELETE TO authenticated
  USING (public.has_company_access(auth.uid(), company_id));

CREATE TRIGGER trg_forecast_versions_updated_at
  BEFORE UPDATE ON public.forecast_versions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();