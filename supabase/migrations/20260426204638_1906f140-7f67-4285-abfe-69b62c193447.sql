
CREATE TABLE IF NOT EXISTS public.bureau_client_risk (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.accounting_firms(id) ON DELETE CASCADE,
  firm_client_id uuid NOT NULL REFERENCES public.firm_clients(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  score numeric NOT NULL DEFAULT 0,
  level text NOT NULL DEFAULT 'safe' CHECK (level IN ('safe','watch','warning','critical')),
  signals jsonb NOT NULL DEFAULT '[]'::jsonb,
  calculated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (firm_client_id)
);
CREATE INDEX IF NOT EXISTS idx_bureau_client_risk_firm ON public.bureau_client_risk(firm_id, level);

CREATE TABLE IF NOT EXISTS public.bureau_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.accounting_firms(id) ON DELETE CASCADE,
  firm_client_id uuid REFERENCES public.firm_clients(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  severity text NOT NULL CHECK (severity IN ('critical','warning','info')),
  code text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  action_url text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','dismissed','resolved')),
  dismissed_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bureau_alerts_firm_status ON public.bureau_alerts(firm_id, status, severity);

CREATE TABLE IF NOT EXISTS public.bureau_automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.accounting_firms(id) ON DELETE CASCADE,
  template text NOT NULL,
  name text NOT NULL,
  description text,
  enabled boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (firm_id, template)
);

CREATE TABLE IF NOT EXISTS public.bureau_automation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.accounting_firms(id) ON DELETE CASCADE,
  rule_id uuid REFERENCES public.bureau_automation_rules(id) ON DELETE SET NULL,
  firm_client_id uuid REFERENCES public.firm_clients(id) ON DELETE SET NULL,
  template text NOT NULL,
  status text NOT NULL CHECK (status IN ('success','failed','awaiting_approval','skipped')),
  result_summary text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bureau_automation_log_firm_date ON public.bureau_automation_log(firm_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.bureau_portfolio_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.accounting_firms(id) ON DELETE CASCADE,
  insight_type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  week_starts_on date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bureau_portfolio_insights_firm_date ON public.bureau_portfolio_insights(firm_id, created_at DESC);

ALTER TABLE public.bureau_client_risk         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bureau_alerts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bureau_automation_rules    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bureau_automation_log      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bureau_portfolio_insights  ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Firm members read risk"
    ON public.bureau_client_risk FOR SELECT TO authenticated
    USING (public.is_firm_member(auth.uid(), firm_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Firm admins write risk"
    ON public.bureau_client_risk FOR ALL TO authenticated
    USING (public.is_firm_admin(auth.uid(), firm_id))
    WITH CHECK (public.is_firm_admin(auth.uid(), firm_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Firm members read alerts"
    ON public.bureau_alerts FOR SELECT TO authenticated
    USING (public.is_firm_member(auth.uid(), firm_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Firm members update alerts"
    ON public.bureau_alerts FOR UPDATE TO authenticated
    USING (public.is_firm_member(auth.uid(), firm_id))
    WITH CHECK (public.is_firm_member(auth.uid(), firm_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Firm admins insert alerts"
    ON public.bureau_alerts FOR INSERT TO authenticated
    WITH CHECK (public.is_firm_admin(auth.uid(), firm_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Firm members read rules"
    ON public.bureau_automation_rules FOR SELECT TO authenticated
    USING (public.is_firm_member(auth.uid(), firm_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Firm admins write rules"
    ON public.bureau_automation_rules FOR ALL TO authenticated
    USING (public.is_firm_admin(auth.uid(), firm_id))
    WITH CHECK (public.is_firm_admin(auth.uid(), firm_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Firm members read log"
    ON public.bureau_automation_log FOR SELECT TO authenticated
    USING (public.is_firm_member(auth.uid(), firm_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Firm admins insert log"
    ON public.bureau_automation_log FOR INSERT TO authenticated
    WITH CHECK (public.is_firm_admin(auth.uid(), firm_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Firm members read portfolio insights"
    ON public.bureau_portfolio_insights FOR SELECT TO authenticated
    USING (public.is_firm_member(auth.uid(), firm_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Firm admins write portfolio insights"
    ON public.bureau_portfolio_insights FOR ALL TO authenticated
    USING (public.is_firm_admin(auth.uid(), firm_id))
    WITH CHECK (public.is_firm_admin(auth.uid(), firm_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
