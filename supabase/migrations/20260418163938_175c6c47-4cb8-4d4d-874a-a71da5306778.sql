CREATE TABLE public.closing_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  fiscal_year INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'analyzing',
  progress_pct NUMERIC NOT NULL DEFAULT 0,
  ai_confidence NUMERIC,
  critical_issues_count INTEGER NOT NULL DEFAULT 0,
  warning_issues_count INTEGER NOT NULL DEFAULT 0,
  eta_seconds INTEGER,
  current_step INTEGER NOT NULL DEFAULT 0,
  total_steps INTEGER NOT NULL DEFAULT 6,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  started_by UUID,
  is_dry_run BOOLEAN NOT NULL DEFAULT false,
  adjustments_applied JSONB NOT NULL DEFAULT '[]'::jsonb,
  blockers JSONB NOT NULL DEFAULT '[]'::jsonb,
  live_preview JSONB NOT NULL DEFAULT '{}'::jsonb,
  tasks JSONB NOT NULL DEFAULT '[]'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_closing_runs_company_year ON public.closing_runs(company_id, fiscal_year);
CREATE INDEX idx_closing_runs_status ON public.closing_runs(status);

ALTER TABLE public.closing_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view closing runs for their company"
ON public.closing_runs FOR SELECT
USING (
  public.has_role(auth.uid(), 'owner', company_id)
  OR public.has_role(auth.uid(), 'admin', company_id)
  OR public.has_role(auth.uid(), 'accountant', company_id)
  OR public.has_role(auth.uid(), 'cfo', company_id)
  OR public.has_role(auth.uid(), 'auditor', company_id)
  OR public.has_role(auth.uid(), 'board_member', company_id)
);

CREATE POLICY "Users can create closing runs for their company"
ON public.closing_runs FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'owner', company_id)
  OR public.has_role(auth.uid(), 'admin', company_id)
  OR public.has_role(auth.uid(), 'accountant', company_id)
  OR public.has_role(auth.uid(), 'cfo', company_id)
);

CREATE POLICY "Users can update closing runs for their company"
ON public.closing_runs FOR UPDATE
USING (
  public.has_role(auth.uid(), 'owner', company_id)
  OR public.has_role(auth.uid(), 'admin', company_id)
  OR public.has_role(auth.uid(), 'accountant', company_id)
  OR public.has_role(auth.uid(), 'cfo', company_id)
);

CREATE TRIGGER update_closing_runs_updated_at
BEFORE UPDATE ON public.closing_runs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.closing_runs REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.closing_runs;