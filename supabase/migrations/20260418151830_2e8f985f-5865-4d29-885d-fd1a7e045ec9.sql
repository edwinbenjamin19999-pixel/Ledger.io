
-- 1. RECURRING CASH EVENTS
CREATE TABLE public.recurring_cash_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  label text NOT NULL,
  expected_amount numeric NOT NULL,
  direction text NOT NULL CHECK (direction IN ('inflow','outflow')),
  frequency text NOT NULL DEFAULT 'monthly',
  next_expected_date date NOT NULL,
  day_of_month int,
  confidence_score numeric DEFAULT 0.7,
  source_account_id uuid REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  active boolean NOT NULL DEFAULT true,
  detected_from_pattern boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_rce_company ON public.recurring_cash_events(company_id, active, next_expected_date);
ALTER TABLE public.recurring_cash_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rce_read" ON public.recurring_cash_events FOR SELECT USING (
  has_role(auth.uid(),'owner',company_id) OR has_role(auth.uid(),'admin',company_id)
  OR has_role(auth.uid(),'accountant',company_id) OR has_role(auth.uid(),'cfo',company_id)
  OR has_role(auth.uid(),'auditor',company_id)
);
CREATE POLICY "rce_write" ON public.recurring_cash_events FOR ALL USING (
  has_role(auth.uid(),'owner',company_id) OR has_role(auth.uid(),'admin',company_id)
  OR has_role(auth.uid(),'accountant',company_id)
);

-- 2. CASHFLOW SCENARIOS
CREATE TABLE public.cashflow_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  scenario_type text NOT NULL DEFAULT 'custom',
  base_snapshot_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_scenarios_company ON public.cashflow_scenarios(company_id, is_active);
ALTER TABLE public.cashflow_scenarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sc_read" ON public.cashflow_scenarios FOR SELECT USING (
  has_role(auth.uid(),'owner',company_id) OR has_role(auth.uid(),'admin',company_id)
  OR has_role(auth.uid(),'accountant',company_id) OR has_role(auth.uid(),'cfo',company_id)
  OR has_role(auth.uid(),'auditor',company_id)
);
CREATE POLICY "sc_write" ON public.cashflow_scenarios FOR ALL USING (
  has_role(auth.uid(),'owner',company_id) OR has_role(auth.uid(),'admin',company_id)
  OR has_role(auth.uid(),'accountant',company_id) OR has_role(auth.uid(),'cfo',company_id)
);

-- 3. FORECAST SNAPSHOTS
CREATE TABLE public.forecast_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  scenario_id uuid REFERENCES public.cashflow_scenarios(id) ON DELETE SET NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  horizon_days int NOT NULL DEFAULT 90,
  baseline_balance numeric NOT NULL,
  lowest_cash_point numeric,
  lowest_cash_date date,
  runway_days int,
  burn_rate_monthly numeric,
  model_version text NOT NULL DEFAULT 'cashflow_engine_v1',
  input_hash text NOT NULL,
  output_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_snapshots_company_recent ON public.forecast_snapshots(company_id, generated_at DESC);
CREATE INDEX idx_snapshots_hash ON public.forecast_snapshots(company_id, input_hash);
ALTER TABLE public.forecast_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fs_read" ON public.forecast_snapshots FOR SELECT USING (
  has_role(auth.uid(),'owner',company_id) OR has_role(auth.uid(),'admin',company_id)
  OR has_role(auth.uid(),'accountant',company_id) OR has_role(auth.uid(),'cfo',company_id)
  OR has_role(auth.uid(),'auditor',company_id)
);
CREATE POLICY "fs_write" ON public.forecast_snapshots FOR ALL USING (
  has_role(auth.uid(),'owner',company_id) OR has_role(auth.uid(),'admin',company_id)
  OR has_role(auth.uid(),'accountant',company_id) OR has_role(auth.uid(),'cfo',company_id)
);

ALTER TABLE public.cashflow_scenarios
  ADD CONSTRAINT cashflow_scenarios_base_snapshot_fk
  FOREIGN KEY (base_snapshot_id) REFERENCES public.forecast_snapshots(id) ON DELETE SET NULL;

-- 4. FORECAST DAILY POINTS
CREATE TABLE public.forecast_daily_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id uuid NOT NULL REFERENCES public.forecast_snapshots(id) ON DELETE CASCADE,
  date date NOT NULL,
  opening_balance numeric NOT NULL,
  expected_inflows numeric NOT NULL DEFAULT 0,
  expected_outflows numeric NOT NULL DEFAULT 0,
  net_change numeric NOT NULL DEFAULT 0,
  closing_balance numeric NOT NULL,
  confidence_score numeric DEFAULT 0.8,
  risk_level text DEFAULT 'normal'
);
CREATE INDEX idx_daily_points_snapshot ON public.forecast_daily_points(snapshot_id, date);
ALTER TABLE public.forecast_daily_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fdp_read" ON public.forecast_daily_points FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.forecast_snapshots s WHERE s.id = snapshot_id AND (
    has_role(auth.uid(),'owner',s.company_id) OR has_role(auth.uid(),'admin',s.company_id)
    OR has_role(auth.uid(),'accountant',s.company_id) OR has_role(auth.uid(),'cfo',s.company_id)
    OR has_role(auth.uid(),'auditor',s.company_id)))
);
CREATE POLICY "fdp_write" ON public.forecast_daily_points FOR ALL USING (
  EXISTS (SELECT 1 FROM public.forecast_snapshots s WHERE s.id = snapshot_id AND (
    has_role(auth.uid(),'owner',s.company_id) OR has_role(auth.uid(),'admin',s.company_id)
    OR has_role(auth.uid(),'accountant',s.company_id) OR has_role(auth.uid(),'cfo',s.company_id)))
);

-- 5. SCENARIO ADJUSTMENTS
CREATE TABLE public.scenario_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id uuid NOT NULL REFERENCES public.cashflow_scenarios(id) ON DELETE CASCADE,
  adjustment_type text NOT NULL,
  reference_entity_type text,
  reference_entity_id uuid,
  delta_amount numeric DEFAULT 0,
  delta_days int DEFAULT 0,
  payload_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_scenario_adj_scenario ON public.scenario_adjustments(scenario_id);
ALTER TABLE public.scenario_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sa_read" ON public.scenario_adjustments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.cashflow_scenarios sc WHERE sc.id = scenario_id AND (
    has_role(auth.uid(),'owner',sc.company_id) OR has_role(auth.uid(),'admin',sc.company_id)
    OR has_role(auth.uid(),'accountant',sc.company_id) OR has_role(auth.uid(),'cfo',sc.company_id)
    OR has_role(auth.uid(),'auditor',sc.company_id)))
);
CREATE POLICY "sa_write" ON public.scenario_adjustments FOR ALL USING (
  EXISTS (SELECT 1 FROM public.cashflow_scenarios sc WHERE sc.id = scenario_id AND (
    has_role(auth.uid(),'owner',sc.company_id) OR has_role(auth.uid(),'admin',sc.company_id)
    OR has_role(auth.uid(),'accountant',sc.company_id) OR has_role(auth.uid(),'cfo',sc.company_id)))
);

-- 6. AI CASHFLOW INSIGHTS
CREATE TABLE public.ai_cashflow_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  module text NOT NULL DEFAULT 'cash_command',
  insight_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  summary text NOT NULL,
  confidence_score numeric NOT NULL DEFAULT 0.5,
  source_snapshot_id uuid REFERENCES public.forecast_snapshots(id) ON DELETE SET NULL,
  source_data_refs jsonb NOT NULL DEFAULT '{}'::jsonb,
  model_version text NOT NULL DEFAULT 'ai_cfo_v1',
  is_dismissed boolean NOT NULL DEFAULT false,
  dismissed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_insights_company_recent ON public.ai_cashflow_insights(company_id, created_at DESC) WHERE is_dismissed = false;
ALTER TABLE public.ai_cashflow_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ins_read" ON public.ai_cashflow_insights FOR SELECT USING (
  has_role(auth.uid(),'owner',company_id) OR has_role(auth.uid(),'admin',company_id)
  OR has_role(auth.uid(),'accountant',company_id) OR has_role(auth.uid(),'cfo',company_id)
  OR has_role(auth.uid(),'auditor',company_id)
);
CREATE POLICY "ins_write" ON public.ai_cashflow_insights FOR ALL USING (
  has_role(auth.uid(),'owner',company_id) OR has_role(auth.uid(),'admin',company_id)
  OR has_role(auth.uid(),'accountant',company_id) OR has_role(auth.uid(),'cfo',company_id)
);

-- 7. AI CASHFLOW RECOMMENDATIONS
CREATE TABLE public.ai_cashflow_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_id uuid NOT NULL REFERENCES public.ai_cashflow_insights(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  title text NOT NULL,
  explanation text,
  impact_amount numeric DEFAULT 0,
  impact_runway_days int DEFAULT 0,
  confidence_score numeric NOT NULL DEFAULT 0.5,
  executable boolean NOT NULL DEFAULT false,
  requires_confirmation boolean NOT NULL DEFAULT true,
  execution_status text NOT NULL DEFAULT 'pending',
  executed_at timestamptz,
  executed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_recs_insight ON public.ai_cashflow_recommendations(insight_id);
ALTER TABLE public.ai_cashflow_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rec_read" ON public.ai_cashflow_recommendations FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.ai_cashflow_insights i WHERE i.id = insight_id AND (
    has_role(auth.uid(),'owner',i.company_id) OR has_role(auth.uid(),'admin',i.company_id)
    OR has_role(auth.uid(),'accountant',i.company_id) OR has_role(auth.uid(),'cfo',i.company_id)
    OR has_role(auth.uid(),'auditor',i.company_id)))
);
CREATE POLICY "rec_write" ON public.ai_cashflow_recommendations FOR ALL USING (
  EXISTS (SELECT 1 FROM public.ai_cashflow_insights i WHERE i.id = insight_id AND (
    has_role(auth.uid(),'owner',i.company_id) OR has_role(auth.uid(),'admin',i.company_id)
    OR has_role(auth.uid(),'accountant',i.company_id) OR has_role(auth.uid(),'cfo',i.company_id)))
);

-- 8. CALCULATION AUDIT LOG
CREATE TABLE public.calculation_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  calculation_type text NOT NULL,
  trigger_source text,
  input_refs jsonb NOT NULL DEFAULT '{}'::jsonb,
  output_refs jsonb NOT NULL DEFAULT '{}'::jsonb,
  model_version text,
  duration_ms int,
  status text NOT NULL DEFAULT 'success',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_company_recent ON public.calculation_audit_log(company_id, created_at DESC);
ALTER TABLE public.calculation_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aud_read" ON public.calculation_audit_log FOR SELECT USING (
  has_role(auth.uid(),'owner',company_id) OR has_role(auth.uid(),'admin',company_id)
  OR has_role(auth.uid(),'accountant',company_id) OR has_role(auth.uid(),'cfo',company_id)
  OR has_role(auth.uid(),'auditor',company_id)
);
CREATE POLICY "aud_write" ON public.calculation_audit_log FOR INSERT WITH CHECK (
  has_role(auth.uid(),'owner',company_id) OR has_role(auth.uid(),'admin',company_id)
  OR has_role(auth.uid(),'accountant',company_id) OR has_role(auth.uid(),'cfo',company_id)
);

-- REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.forecast_snapshots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_cashflow_insights;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cashflow_scenarios;

-- TIMESTAMPS
CREATE TRIGGER trg_rce_updated BEFORE UPDATE ON public.recurring_cash_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_scenarios_updated BEFORE UPDATE ON public.cashflow_scenarios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
