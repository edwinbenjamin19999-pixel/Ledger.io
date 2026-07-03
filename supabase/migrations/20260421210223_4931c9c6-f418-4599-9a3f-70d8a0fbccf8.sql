-- Extend firm_clients with profitability/risk scoring (cached scores updated by jobs)
ALTER TABLE public.firm_clients
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS profitability_score numeric,
  ADD COLUMN IF NOT EXISTS risk_score numeric,
  ADD COLUMN IF NOT EXISTS revenue_ytd numeric,
  ADD COLUMN IF NOT EXISTS cost_ytd numeric,
  ADD COLUMN IF NOT EXISTS margin_pct numeric,
  ADD COLUMN IF NOT EXISTS automation_share numeric,
  ADD COLUMN IF NOT EXISTS scores_updated_at timestamptz;

-- Firm-level insights (cross-client AI insights surfaced in WL workspace)
CREATE TABLE IF NOT EXISTS public.firm_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.accounting_firms(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.firm_clients(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  severity text NOT NULL DEFAULT 'info',
  insight_type text NOT NULL,
  category text,
  title text NOT NULL,
  explanation text,
  impact_value numeric,
  confidence numeric NOT NULL DEFAULT 0.7,
  action_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open',
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_firm_insights_firm_status ON public.firm_insights(firm_id, status);
CREATE INDEX IF NOT EXISTS idx_firm_insights_client ON public.firm_insights(client_id);

ALTER TABLE public.firm_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Firm members read insights"
  ON public.firm_insights FOR SELECT TO authenticated
  USING (public.is_firm_member(auth.uid(), firm_id));

CREATE POLICY "Firm members write insights"
  ON public.firm_insights FOR INSERT TO authenticated
  WITH CHECK (public.is_firm_member(auth.uid(), firm_id));

CREATE POLICY "Firm members update insights"
  ON public.firm_insights FOR UPDATE TO authenticated
  USING (public.is_firm_member(auth.uid(), firm_id));

CREATE POLICY "Firm admin delete insights"
  ON public.firm_insights FOR DELETE TO authenticated
  USING (public.is_firm_admin(auth.uid(), firm_id));

-- Firm-level deadlines (persistent, per client)
CREATE TABLE IF NOT EXISTS public.firm_deadlines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.accounting_firms(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.firm_clients(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  deadline_type text NOT NULL,
  label text NOT NULL,
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  related_task_id uuid REFERENCES public.firm_tasks(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (firm_id, client_id, deadline_type, due_date)
);

CREATE INDEX IF NOT EXISTS idx_firm_deadlines_firm_due ON public.firm_deadlines(firm_id, due_date);

ALTER TABLE public.firm_deadlines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Firm members read deadlines"
  ON public.firm_deadlines FOR SELECT TO authenticated
  USING (public.is_firm_member(auth.uid(), firm_id));

CREATE POLICY "Firm members write deadlines"
  ON public.firm_deadlines FOR INSERT TO authenticated
  WITH CHECK (public.is_firm_member(auth.uid(), firm_id));

CREATE POLICY "Firm members update deadlines"
  ON public.firm_deadlines FOR UPDATE TO authenticated
  USING (public.is_firm_member(auth.uid(), firm_id));

CREATE POLICY "Firm admin delete deadlines"
  ON public.firm_deadlines FOR DELETE TO authenticated
  USING (public.is_firm_admin(auth.uid(), firm_id));

-- updated_at triggers
CREATE TRIGGER trg_firm_insights_updated_at
  BEFORE UPDATE ON public.firm_insights
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_firm_deadlines_updated_at
  BEFORE UPDATE ON public.firm_deadlines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();