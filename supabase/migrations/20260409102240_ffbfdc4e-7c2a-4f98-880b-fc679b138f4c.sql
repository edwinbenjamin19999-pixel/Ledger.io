
-- Period closing tracker
CREATE TABLE public.closing_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL DEFAULT 'month', -- 'month' or 'year'
  period_year INT NOT NULL,
  period_month INT, -- NULL for year-end
  status TEXT NOT NULL DEFAULT 'open', -- open, soft_closed, in_review, hard_closed
  soft_closed_at TIMESTAMPTZ,
  soft_closed_by UUID,
  review_started_at TIMESTAMPTZ,
  review_started_by UUID,
  hard_closed_at TIMESTAMPTZ,
  hard_closed_by UUID,
  notes TEXT,
  progress_percent INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, period_type, period_year, period_month)
);

ALTER TABLE public.closing_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view closing periods" ON public.closing_periods
  FOR SELECT TO authenticated
  USING (public.has_company_membership(auth.uid(), company_id));

CREATE POLICY "Accountants can manage closing periods" ON public.closing_periods
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'owner'::app_role, company_id)
    OR public.has_role(auth.uid(), 'accountant'::app_role, company_id)
    OR public.has_role(auth.uid(), 'cfo'::app_role, company_id)
  );

CREATE POLICY "Accountants can update closing periods" ON public.closing_periods
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'owner'::app_role, company_id)
    OR public.has_role(auth.uid(), 'accountant'::app_role, company_id)
    OR public.has_role(auth.uid(), 'cfo'::app_role, company_id)
  );

CREATE INDEX idx_closing_periods_company ON public.closing_periods(company_id, period_year, period_month);

-- Checklist items per period
CREATE TABLE public.closing_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  closing_period_id UUID NOT NULL REFERENCES public.closing_periods(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- 'reconciliation', 'accrual', 'depreciation', 'vat', 'payroll', 'review', 'custom'
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, in_progress, completed, skipped, blocked
  assigned_to UUID,
  completed_at TIMESTAMPTZ,
  completed_by UUID,
  sort_order INT DEFAULT 0,
  is_required BOOLEAN DEFAULT true,
  auto_check_type TEXT, -- 'bank_reconciled', 'vat_filed', 'payroll_approved', 'depreciation_booked', etc.
  auto_check_result BOOLEAN,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.closing_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view checklist items" ON public.closing_checklist_items
  FOR SELECT TO authenticated
  USING (public.has_company_membership(auth.uid(), company_id));

CREATE POLICY "Accountants can manage checklist items" ON public.closing_checklist_items
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'owner'::app_role, company_id)
    OR public.has_role(auth.uid(), 'accountant'::app_role, company_id)
    OR public.has_role(auth.uid(), 'cfo'::app_role, company_id)
  );

CREATE POLICY "Accountants can update checklist items" ON public.closing_checklist_items
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'owner'::app_role, company_id)
    OR public.has_role(auth.uid(), 'accountant'::app_role, company_id)
    OR public.has_role(auth.uid(), 'cfo'::app_role, company_id)
  );

CREATE INDEX idx_closing_checklist_period ON public.closing_checklist_items(closing_period_id);

-- Period locks
CREATE TABLE public.closing_period_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  locked_from DATE NOT NULL,
  locked_to DATE NOT NULL,
  locked_by UUID NOT NULL,
  locked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unlock_reason TEXT,
  unlocked_by UUID,
  unlocked_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  closing_period_id UUID REFERENCES public.closing_periods(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.closing_period_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view locks" ON public.closing_period_locks
  FOR SELECT TO authenticated
  USING (public.has_company_membership(auth.uid(), company_id));

CREATE POLICY "Owners can manage locks" ON public.closing_period_locks
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'owner'::app_role, company_id)
    OR public.has_role(auth.uid(), 'accountant'::app_role, company_id)
  );

CREATE POLICY "Owners can update locks" ON public.closing_period_locks
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'owner'::app_role, company_id)
  );

CREATE INDEX idx_closing_locks_company ON public.closing_period_locks(company_id, is_active);
