
-- HR Engine: events, agreements, anomalies
CREATE TABLE IF NOT EXISTS public.hr_event_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_key TEXT NOT NULL UNIQUE,
  label_sv TEXT NOT NULL,
  group_type TEXT NOT NULL,
  color_token TEXT NOT NULL DEFAULT 'hsl(var(--muted))',
  payroll_code TEXT,
  affects_salary BOOLEAN NOT NULL DEFAULT false,
  multiplier NUMERIC NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.hr_event_categories (category_key, label_sv, group_type, color_token, payroll_code, affects_salary, multiplier) VALUES
  ('work_regular', 'Arbetad tid', 'work', 'hsl(142 71% 45%)', 'LON', true, 1.0),
  ('work_overtime_50', 'Övertid 50%', 'work', 'hsl(142 71% 35%)', 'OT50', true, 1.5),
  ('work_overtime_100', 'Övertid 100%', 'work', 'hsl(142 71% 25%)', 'OT100', true, 2.0),
  ('work_ob_evening', 'OB kväll', 'work', 'hsl(258 90% 66%)', 'OB_EVE', true, 1.25),
  ('work_ob_night', 'OB natt', 'work', 'hsl(258 90% 50%)', 'OB_NGT', true, 1.7),
  ('work_ob_weekend', 'OB helg', 'work', 'hsl(258 90% 40%)', 'OB_WKD', true, 1.5),
  ('work_travel', 'Restid', 'work', 'hsl(199 89% 48%)', 'TRAVEL', true, 1.0),
  ('absence_sick_d1', 'Sjuk dag 1 (karens)', 'absence', 'hsl(0 84% 60%)', 'SICK_D1', true, 0),
  ('absence_sick', 'Sjuk dag 2-14', 'absence', 'hsl(0 84% 50%)', 'SICK', true, 0.8),
  ('absence_sick_long', 'Långtidssjukskrivning', 'absence', 'hsl(0 84% 40%)', 'SICK_LONG', true, 0),
  ('absence_vab', 'VAB', 'absence', 'hsl(48 96% 53%)', 'VAB', true, 0),
  ('absence_parental', 'Föräldraledighet', 'absence', 'hsl(280 90% 60%)', 'PARENT', true, 0),
  ('absence_unpaid', 'Tjänstledig (obetald)', 'absence', 'hsl(220 9% 46%)', 'UNPAID', true, 0),
  ('absence_study', 'Studieledighet', 'absence', 'hsl(220 9% 40%)', 'STUDY', false, 0),
  ('vacation_paid', 'Semester (betald)', 'vacation', 'hsl(217 91% 60%)', 'VAC', true, 1.0),
  ('vacation_unpaid', 'Semester (obetald)', 'vacation', 'hsl(217 91% 45%)', 'VAC_UP', true, 0),
  ('vacation_half', 'Halvdag semester', 'vacation', 'hsl(217 91% 70%)', 'VAC_H', true, 0.5),
  ('comp_mileage', 'Milersättning', 'comp', 'hsl(173 80% 40%)', 'MILE', true, 0),
  ('comp_per_diem', 'Traktamente', 'comp', 'hsl(173 80% 35%)', 'PERDIEM', true, 0),
  ('comp_expense', 'Utlägg', 'comp', 'hsl(173 80% 30%)', 'EXP', true, 0),
  ('comp_bonus', 'Bonus', 'comp', 'hsl(38 92% 50%)', 'BONUS', true, 0)
ON CONFLICT (category_key) DO NOTHING;

ALTER TABLE public.hr_event_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hr_event_categories_read" ON public.hr_event_categories FOR SELECT USING (true);

-- Events table: every time/absence/comp entry per employee
CREATE TABLE IF NOT EXISTS public.hr_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  category_key TEXT NOT NULL REFERENCES public.hr_event_categories(category_key),
  event_date DATE NOT NULL,
  event_end_date DATE,
  hours NUMERIC,
  amount NUMERIC,
  quantity NUMERIC,
  unit TEXT,
  description TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  source_text TEXT,
  ai_confidence NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  payroll_run_id UUID REFERENCES public.payroll_runs(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hr_events_company ON public.hr_events(company_id, event_date DESC);
CREATE INDEX idx_hr_events_employee ON public.hr_events(employee_id, event_date DESC);
CREATE INDEX idx_hr_events_status ON public.hr_events(company_id, status) WHERE status = 'pending';

ALTER TABLE public.hr_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hr_events_select" ON public.hr_events FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR public.has_company_access(auth.uid(), company_id));
CREATE POLICY "hr_events_insert" ON public.hr_events FOR INSERT
  WITH CHECK (public.has_company_access(auth.uid(), company_id));
CREATE POLICY "hr_events_update" ON public.hr_events FOR UPDATE
  USING (public.has_company_access(auth.uid(), company_id));
CREATE POLICY "hr_events_delete" ON public.hr_events FOR DELETE
  USING (public.has_company_access(auth.uid(), company_id));

CREATE TRIGGER trg_hr_events_updated_at
  BEFORE UPDATE ON public.hr_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Collective agreements (templates + per-company instances)
CREATE TABLE IF NOT EXISTS public.collective_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  is_template BOOLEAN NOT NULL DEFAULT false,
  template_key TEXT,
  name TEXT NOT NULL,
  description TEXT,
  rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.collective_agreements (is_template, template_key, name, description, rules) VALUES
  (true, 'teknikavtalet_if', 'Teknikavtalet IF Metall', 'Industri och teknik', '{"overtime":{"weekday_50":true,"weekend_100":true},"ob":{"evening_pct":25,"night_pct":70,"weekend_pct":100},"vacation_days":25,"sick_waiting_day":true}'::jsonb),
  (true, 'it_avtalet', 'IT-avtalet (Almega/Unionen)', 'Tjänstemän inom IT', '{"overtime":{"comp_time_default":true,"weekday_50":true,"weekend_100":true},"ob":{"evening_pct":25,"weekend_pct":75},"vacation_days":25,"sick_waiting_day":true}'::jsonb),
  (true, 'handels', 'Detaljhandelsavtalet', 'Handel och butik', '{"overtime":{"weekday_50":true,"weekend_100":true},"ob":{"evening_pct":50,"weekend_pct":100},"vacation_days":25,"sick_waiting_day":true}'::jsonb),
  (true, 'no_agreement', 'Inget kollektivavtal', 'Endast lagstadgade regler (LAS, semesterlagen)', '{"overtime":{"weekday_50":false},"ob":{},"vacation_days":25,"sick_waiting_day":true}'::jsonb)
ON CONFLICT DO NOTHING;

ALTER TABLE public.collective_agreements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "collective_agreements_read_templates" ON public.collective_agreements FOR SELECT
  USING (is_template = true OR public.has_company_access(auth.uid(), company_id));
CREATE POLICY "collective_agreements_write_company" ON public.collective_agreements FOR ALL
  USING (is_template = false AND public.has_company_access(auth.uid(), company_id))
  WITH CHECK (is_template = false AND public.has_company_access(auth.uid(), company_id));

CREATE TRIGGER trg_collective_agreements_updated_at
  BEFORE UPDATE ON public.collective_agreements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Link employees to agreement (nullable, optional column)
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS collective_agreement_id UUID REFERENCES public.collective_agreements(id) ON DELETE SET NULL;

-- Pre-payroll review anomalies (per run, per employee)
CREATE TABLE IF NOT EXISTS public.payroll_review_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  payroll_run_id UUID NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  severity TEXT NOT NULL DEFAULT 'review',
  flag_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  ai_recommendation TEXT,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payroll_review_run ON public.payroll_review_flags(payroll_run_id);

ALTER TABLE public.payroll_review_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payroll_review_flags_select" ON public.payroll_review_flags FOR SELECT
  USING (public.has_company_access(auth.uid(), company_id));
CREATE POLICY "payroll_review_flags_modify" ON public.payroll_review_flags FOR ALL
  USING (public.has_company_access(auth.uid(), company_id))
  WITH CHECK (public.has_company_access(auth.uid(), company_id));

-- Per-employee approval status for a payroll run
CREATE TABLE IF NOT EXISTS public.payroll_employee_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id UUID NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  excluded BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(payroll_run_id, employee_id)
);

ALTER TABLE public.payroll_employee_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payroll_emp_approvals_all" ON public.payroll_employee_approvals FOR ALL
  USING (public.has_company_access(auth.uid(), company_id))
  WITH CHECK (public.has_company_access(auth.uid(), company_id));

CREATE TRIGGER trg_payroll_emp_approvals_updated
  BEFORE UPDATE ON public.payroll_employee_approvals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
