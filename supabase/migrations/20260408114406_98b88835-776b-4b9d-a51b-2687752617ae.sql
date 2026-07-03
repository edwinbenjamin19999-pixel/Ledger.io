
-- POS connections (Zettle, SumUp, etc.)
CREATE TABLE IF NOT EXISTS public.pos_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- zettle, sumup, nets, manual
  provider_name TEXT NOT NULL,
  api_key_encrypted TEXT,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pos_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members can manage pos_connections" ON public.pos_connections
  FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

-- VAT category mapping
CREATE TABLE IF NOT EXISTS public.pos_vat_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  pos_category TEXT NOT NULL,
  vat_rate NUMERIC NOT NULL DEFAULT 25,
  account_number TEXT NOT NULL DEFAULT '3000',
  account_name TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pos_vat_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members can manage pos_vat_categories" ON public.pos_vat_categories
  FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

-- Daily sales summaries
CREATE TABLE IF NOT EXISTS public.pos_daily_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  sale_date DATE NOT NULL,
  total_sales NUMERIC NOT NULL DEFAULT 0,
  cash_amount NUMERIC NOT NULL DEFAULT 0,
  card_amount NUMERIC NOT NULL DEFAULT 0,
  swish_amount NUMERIC NOT NULL DEFAULT 0,
  other_amount NUMERIC NOT NULL DEFAULT 0,
  transaction_count INTEGER NOT NULL DEFAULT 0,
  vat_breakdown JSONB DEFAULT '[]',
  is_booked BOOLEAN NOT NULL DEFAULT false,
  journal_entry_id UUID REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  closed_by UUID,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, sale_date)
);
ALTER TABLE public.pos_daily_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members can manage pos_daily_sales" ON public.pos_daily_sales
  FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

-- Z-report archive
CREATE TABLE IF NOT EXISTS public.pos_z_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  report_number TEXT,
  total_sales NUMERIC NOT NULL DEFAULT 0,
  cash_amount NUMERIC,
  card_amount NUMERIC,
  swish_amount NUMERIC,
  returns_amount NUMERIC DEFAULT 0,
  file_url TEXT,
  file_name TEXT,
  source TEXT DEFAULT 'manual', -- manual, zettle, sumup
  notes TEXT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pos_z_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members can manage pos_z_reports" ON public.pos_z_reports
  FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE INDEX idx_pos_daily_sales_company_date ON public.pos_daily_sales(company_id, sale_date);
CREATE INDEX idx_pos_z_reports_company_date ON public.pos_z_reports(company_id, report_date);
