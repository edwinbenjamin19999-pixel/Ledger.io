
-- Time entries
CREATE TABLE IF NOT EXISTS public.time_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  client_name TEXT,
  description TEXT,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  is_billable BOOLEAN NOT NULL DEFAULT true,
  is_billed BOOLEAN NOT NULL DEFAULT false,
  billed_invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  hourly_rate NUMERIC DEFAULT 0,
  rate_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view time_entries" ON public.time_entries
  FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Company members can insert time_entries" ON public.time_entries
  FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Company members can update time_entries" ON public.time_entries
  FOR UPDATE TO authenticated
  USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Company members can delete time_entries" ON public.time_entries
  FOR DELETE TO authenticated
  USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

-- Time rates per client
CREATE TABLE IF NOT EXISTS public.time_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_name TEXT,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  rate_label TEXT NOT NULL DEFAULT 'Standard',
  hourly_rate NUMERIC NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.time_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can manage time_rates" ON public.time_rates
  FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE INDEX idx_time_entries_company_date ON public.time_entries(company_id, entry_date);
CREATE INDEX idx_time_entries_billed ON public.time_entries(company_id, is_billed, is_billable);
