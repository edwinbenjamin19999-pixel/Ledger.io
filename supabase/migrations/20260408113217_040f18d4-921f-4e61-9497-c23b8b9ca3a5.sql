
-- RUT/ROT company settings
CREATE TABLE IF NOT EXISTS public.rut_rot_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE UNIQUE,
  rut_enabled BOOLEAN NOT NULL DEFAULT false,
  rot_enabled BOOLEAN NOT NULL DEFAULT false,
  f_skatt_confirmed BOOLEAN NOT NULL DEFAULT false,
  skv_registered_confirmed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rut_rot_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view rut_rot_settings" ON public.rut_rot_settings
  FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Company members can insert rut_rot_settings" ON public.rut_rot_settings
  FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Company members can update rut_rot_settings" ON public.rut_rot_settings
  FOR UPDATE TO authenticated
  USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

-- RUT/ROT invoice details
CREATE TABLE IF NOT EXISTS public.rut_rot_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  deduction_type TEXT NOT NULL CHECK (deduction_type IN ('rut', 'rot')),
  labor_cost NUMERIC NOT NULL DEFAULT 0,
  material_cost NUMERIC NOT NULL DEFAULT 0,
  travel_cost NUMERIC NOT NULL DEFAULT 0,
  deduction_amount NUMERIC NOT NULL DEFAULT 0,
  customer_pays NUMERIC NOT NULL DEFAULT 0,
  customer_personal_id TEXT NOT NULL,
  property_designation TEXT,
  work_description TEXT,
  skv_status TEXT NOT NULL DEFAULT 'not_applied',
  skv_applied_at TIMESTAMPTZ,
  skv_reference TEXT,
  skv_paid_at TIMESTAMPTZ,
  skv_paid_amount NUMERIC,
  skv_rejection_reason TEXT,
  journal_entry_id UUID REFERENCES public.journal_entries(id),
  skv_payment_journal_id UUID REFERENCES public.journal_entries(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rut_rot_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view rut_rot_invoices" ON public.rut_rot_invoices
  FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Company members can insert rut_rot_invoices" ON public.rut_rot_invoices
  FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Company members can update rut_rot_invoices" ON public.rut_rot_invoices
  FOR UPDATE TO authenticated
  USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

-- Customer annual limit tracking
CREATE TABLE IF NOT EXISTS public.rut_rot_customer_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_personal_id TEXT NOT NULL,
  customer_name TEXT,
  year INTEGER NOT NULL,
  deduction_type TEXT NOT NULL CHECK (deduction_type IN ('rut', 'rot')),
  total_used NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, customer_personal_id, year, deduction_type)
);

ALTER TABLE public.rut_rot_customer_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view rut_rot_customer_limits" ON public.rut_rot_customer_limits
  FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Company members can manage rut_rot_customer_limits" ON public.rut_rot_customer_limits
  FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));
