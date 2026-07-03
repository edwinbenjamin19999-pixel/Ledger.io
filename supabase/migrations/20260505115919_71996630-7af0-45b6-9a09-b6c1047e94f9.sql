
CREATE TABLE IF NOT EXISTS public.autofix_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  module TEXT NOT NULL, -- 'hr','accounting','vat','payroll','journal',...
  rule_key TEXT NOT NULL, -- 'hr.tax_table_mismatch', 'journal.draft_no_lines', ...
  severity TEXT NOT NULL DEFAULT 'medium', -- low/medium/high/critical
  confidence NUMERIC(5,2) NOT NULL DEFAULT 0, -- 0..100
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  suggested_action TEXT NOT NULL,
  entity_table TEXT, -- e.g. 'employees'
  entity_id UUID,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb, -- detector context + fix params
  status TEXT NOT NULL DEFAULT 'open', -- open/applied/dismissed/failed
  applied_by UUID,
  applied_at TIMESTAMPTZ,
  dismissed_by UUID,
  dismissed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, rule_key, entity_table, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_autofix_findings_company_status ON public.autofix_findings(company_id, status);
CREATE INDEX IF NOT EXISTS idx_autofix_findings_module ON public.autofix_findings(company_id, module, status);

ALTER TABLE public.autofix_findings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "autofix_findings_owner_accountant_all"
ON public.autofix_findings FOR ALL TO authenticated
USING (
  has_company_access(auth.uid(), company_id)
  AND (has_role(auth.uid(), 'owner'::app_role, company_id) OR has_role(auth.uid(), 'accountant'::app_role, company_id))
)
WITH CHECK (
  has_company_access(auth.uid(), company_id)
  AND (has_role(auth.uid(), 'owner'::app_role, company_id) OR has_role(auth.uid(), 'accountant'::app_role, company_id))
);

CREATE TRIGGER trg_autofix_findings_updated_at
BEFORE UPDATE ON public.autofix_findings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.autofix_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  triggered_by UUID,
  source TEXT NOT NULL DEFAULT 'manual', -- manual/scheduled/post-action
  kind TEXT NOT NULL, -- 'scan' or 'apply'
  module TEXT,
  findings_total INT DEFAULT 0,
  findings_new INT DEFAULT 0,
  findings_applied INT DEFAULT 0,
  findings_failed INT DEFAULT 0,
  duration_ms INT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_autofix_runs_company ON public.autofix_runs(company_id, created_at DESC);

ALTER TABLE public.autofix_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "autofix_runs_owner_accountant_select"
ON public.autofix_runs FOR SELECT TO authenticated
USING (
  has_company_access(auth.uid(), company_id)
  AND (has_role(auth.uid(), 'owner'::app_role, company_id) OR has_role(auth.uid(), 'accountant'::app_role, company_id))
);

CREATE POLICY "autofix_runs_owner_accountant_insert"
ON public.autofix_runs FOR INSERT TO authenticated
WITH CHECK (
  has_company_access(auth.uid(), company_id)
  AND (has_role(auth.uid(), 'owner'::app_role, company_id) OR has_role(auth.uid(), 'accountant'::app_role, company_id))
);
