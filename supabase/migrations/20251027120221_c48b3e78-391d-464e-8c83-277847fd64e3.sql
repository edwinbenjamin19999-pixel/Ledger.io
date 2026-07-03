-- Create cost centers/projects table
CREATE TABLE IF NOT EXISTS public.cost_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  budget NUMERIC,
  parent_id UUID REFERENCES public.cost_centers(id) ON DELETE SET NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, code)
);

-- Enable RLS
ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;

-- Policies for cost centers
CREATE POLICY "Users can view cost centers for accessible companies"
  ON public.cost_centers FOR SELECT
  USING (has_company_access(auth.uid(), company_id));

CREATE POLICY "Owners and accountants can manage cost centers"
  ON public.cost_centers FOR ALL
  USING (
    has_company_access(auth.uid(), company_id) AND
    (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'accountant'))
  );

-- Add cost_center_id to journal_entry_lines
ALTER TABLE public.journal_entry_lines 
ADD COLUMN IF NOT EXISTS cost_center_id UUID REFERENCES public.cost_centers(id) ON DELETE SET NULL;

-- Create budgets table
CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE CASCADE,
  cost_center_id UUID REFERENCES public.cost_centers(id) ON DELETE SET NULL,
  year INTEGER NOT NULL,
  month INTEGER CHECK (month >= 1 AND month <= 12),
  amount NUMERIC NOT NULL,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, account_id, cost_center_id, year, month)
);

-- Enable RLS
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- Policies for budgets
CREATE POLICY "Users can view budgets for accessible companies"
  ON public.budgets FOR SELECT
  USING (has_company_access(auth.uid(), company_id));

CREATE POLICY "Owners and accountants can manage budgets"
  ON public.budgets FOR ALL
  USING (
    has_company_access(auth.uid(), company_id) AND
    (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'accountant'))
  );

-- Create settings table for company-specific settings
CREATE TABLE IF NOT EXISTS public.company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  fiscal_year_start INTEGER NOT NULL DEFAULT 1,
  fiscal_year_end INTEGER NOT NULL DEFAULT 12,
  accounting_method TEXT NOT NULL DEFAULT 'accrual',
  auto_approve_threshold NUMERIC DEFAULT 0.95,
  require_cost_center BOOLEAN NOT NULL DEFAULT false,
  allow_negative_balance BOOLEAN NOT NULL DEFAULT false,
  decimal_places INTEGER NOT NULL DEFAULT 2,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Policies for company settings
CREATE POLICY "Users can view settings for accessible companies"
  ON public.company_settings FOR SELECT
  USING (has_company_access(auth.uid(), company_id));

CREATE POLICY "Owners can manage company settings"
  ON public.company_settings FOR ALL
  USING (
    has_company_access(auth.uid(), company_id) AND
    has_role(auth.uid(), 'owner')
  );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cost_centers_updated_at
  BEFORE UPDATE ON public.cost_centers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_budgets_updated_at
  BEFORE UPDATE ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_company_settings_updated_at
  BEFORE UPDATE ON public.company_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();