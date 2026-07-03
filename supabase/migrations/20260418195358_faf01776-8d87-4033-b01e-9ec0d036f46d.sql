CREATE TABLE public.financial_report_explanations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  period_label TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  summary TEXT,
  key_drivers JSONB NOT NULL DEFAULT '[]'::jsonb,
  risk_signals JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommended_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence_reasoning TEXT,
  kpi_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  validation_findings JSONB NOT NULL DEFAULT '[]'::jsonb,
  imbalance_diff NUMERIC,
  model_version TEXT DEFAULT 'google/gemini-3-flash-preview',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fre_company_period ON public.financial_report_explanations(company_id, period_label);
CREATE INDEX idx_fre_created ON public.financial_report_explanations(created_at DESC);

ALTER TABLE public.financial_report_explanations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view explanations for accessible companies"
  ON public.financial_report_explanations FOR SELECT
  USING (public.has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can insert explanations for accessible companies"
  ON public.financial_report_explanations FOR INSERT
  WITH CHECK (public.has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can update explanations for accessible companies"
  ON public.financial_report_explanations FOR UPDATE
  USING (public.has_company_access(auth.uid(), company_id));

CREATE TRIGGER update_fre_updated_at
  BEFORE UPDATE ON public.financial_report_explanations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();