CREATE TABLE IF NOT EXISTS public.accrual_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  source_invoice_id uuid NULL,
  source_journal_entry_id uuid NULL,
  description text NOT NULL,
  total_amount numeric(14,2) NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  months_total integer NOT NULL CHECK (months_total > 0),
  cost_account_number text NOT NULL,
  prepaid_account_number text NOT NULL DEFAULT '1710',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
  created_by uuid NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accrual_schedules_company ON public.accrual_schedules(company_id, status);
CREATE INDEX IF NOT EXISTS idx_accrual_schedules_invoice ON public.accrual_schedules(source_invoice_id);

CREATE TABLE IF NOT EXISTS public.accrual_postings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES public.accrual_schedules(id) ON DELETE CASCADE,
  period_month date NOT NULL,
  amount numeric(14,2) NOT NULL,
  journal_entry_id uuid NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','posted','skipped')),
  posted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_accrual_postings_schedule ON public.accrual_postings(schedule_id);
CREATE INDEX IF NOT EXISTS idx_accrual_postings_month ON public.accrual_postings(period_month, status);

ALTER TABLE public.accrual_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accrual_postings ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.user_can_access_company_accruals(_company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'owner'::app_role, _company_id)
      OR public.has_role(auth.uid(), 'admin'::app_role, _company_id)
      OR public.has_role(auth.uid(), 'accountant'::app_role, _company_id)
      OR public.has_role(auth.uid(), 'cfo'::app_role, _company_id)
      OR public.has_role(auth.uid(), 'limited_user'::app_role, _company_id);
$$;

CREATE OR REPLACE FUNCTION public.user_can_delete_company_accruals(_company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'owner'::app_role, _company_id)
      OR public.has_role(auth.uid(), 'admin'::app_role, _company_id)
      OR public.has_role(auth.uid(), 'accountant'::app_role, _company_id);
$$;

CREATE POLICY "accrual_schedules_select" ON public.accrual_schedules FOR SELECT TO authenticated
  USING (public.user_can_access_company_accruals(company_id));
CREATE POLICY "accrual_schedules_insert" ON public.accrual_schedules FOR INSERT TO authenticated
  WITH CHECK (public.user_can_access_company_accruals(company_id));
CREATE POLICY "accrual_schedules_update" ON public.accrual_schedules FOR UPDATE TO authenticated
  USING (public.user_can_access_company_accruals(company_id));
CREATE POLICY "accrual_schedules_delete" ON public.accrual_schedules FOR DELETE TO authenticated
  USING (public.user_can_delete_company_accruals(company_id));

CREATE POLICY "accrual_postings_select" ON public.accrual_postings FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.accrual_schedules s WHERE s.id = schedule_id AND public.user_can_access_company_accruals(s.company_id)));
CREATE POLICY "accrual_postings_insert" ON public.accrual_postings FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.accrual_schedules s WHERE s.id = schedule_id AND public.user_can_access_company_accruals(s.company_id)));
CREATE POLICY "accrual_postings_update" ON public.accrual_postings FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.accrual_schedules s WHERE s.id = schedule_id AND public.user_can_access_company_accruals(s.company_id)));

CREATE TRIGGER update_accrual_schedules_updated_at
  BEFORE UPDATE ON public.accrual_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();