-- 1. New table for SKV payment obligations
CREATE TABLE public.skv_payment_obligations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('vat','f_tax','employer_tax','employee_tax')),
  period TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  due_date DATE NOT NULL,
  ocr_reference TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reminded','scheduled','paid','overdue','failed')),
  journal_entry_id UUID REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  payment_id TEXT,
  auto_pay_enabled BOOLEAN NOT NULL DEFAULT false,
  last_reminder_sent_at TIMESTAMPTZ,
  reminder_stage TEXT,
  source_ref TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, payment_type, period)
);

CREATE INDEX idx_skv_obligations_company_due ON public.skv_payment_obligations(company_id, due_date);
CREATE INDEX idx_skv_obligations_status ON public.skv_payment_obligations(status, due_date);

ALTER TABLE public.skv_payment_obligations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view SKV obligations"
ON public.skv_payment_obligations FOR SELECT
USING (
  public.has_role(auth.uid(), 'owner'::app_role, company_id)
  OR public.has_role(auth.uid(), 'accountant'::app_role, company_id)
  OR public.has_role(auth.uid(), 'admin'::app_role, company_id)
);

CREATE POLICY "Company owners/accountants can insert SKV obligations"
ON public.skv_payment_obligations FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'owner'::app_role, company_id)
  OR public.has_role(auth.uid(), 'accountant'::app_role, company_id)
  OR public.has_role(auth.uid(), 'admin'::app_role, company_id)
);

CREATE POLICY "Company owners/accountants can update SKV obligations"
ON public.skv_payment_obligations FOR UPDATE
USING (
  public.has_role(auth.uid(), 'owner'::app_role, company_id)
  OR public.has_role(auth.uid(), 'accountant'::app_role, company_id)
  OR public.has_role(auth.uid(), 'admin'::app_role, company_id)
);

CREATE POLICY "Company owners can delete SKV obligations"
ON public.skv_payment_obligations FOR DELETE
USING (public.has_role(auth.uid(), 'owner'::app_role, company_id));

CREATE TRIGGER trg_skv_obligations_updated_at
BEFORE UPDATE ON public.skv_payment_obligations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Extend automation_settings (add columns if missing)
ALTER TABLE public.automation_settings
  ADD COLUMN IF NOT EXISTS auto_pay_skv_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_pay_skv_max_amount NUMERIC(14,2) NOT NULL DEFAULT 100000,
  ADD COLUMN IF NOT EXISTS auto_pay_skv_days_before INTEGER NOT NULL DEFAULT 1 CHECK (auto_pay_skv_days_before BETWEEN 0 AND 14),
  ADD COLUMN IF NOT EXISTS auto_pay_skv_types TEXT[] NOT NULL DEFAULT ARRAY['vat','f_tax','employer_tax','employee_tax']::TEXT[];