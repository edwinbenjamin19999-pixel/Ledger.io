-- Add industry/sector to companies table
CREATE TYPE public.industry_type AS ENUM (
  'general',
  'real_estate',
  'construction',
  'restaurant',
  'retail',
  'ecommerce',
  'consulting',
  'saas',
  'manufacturing',
  'healthcare',
  'education',
  'other'
);

ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS industry industry_type DEFAULT 'general',
ADD COLUMN IF NOT EXISTS business_description TEXT;

-- Create employees table for HR/Payroll
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  personal_number TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  employment_type TEXT NOT NULL DEFAULT 'full_time',
  employment_start DATE NOT NULL,
  employment_end DATE,
  monthly_salary NUMERIC,
  hourly_rate NUMERIC,
  vacation_days_per_year INTEGER DEFAULT 25,
  vacation_days_used NUMERIC DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  bank_account TEXT,
  tax_table TEXT,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, personal_number)
);

-- Enable RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Policies for employees
CREATE POLICY "Users can view employees for accessible companies"
  ON public.employees FOR SELECT
  USING (has_company_access(auth.uid(), company_id));

CREATE POLICY "Owners and accountants can manage employees"
  ON public.employees FOR ALL
  USING (
    has_company_access(auth.uid(), company_id) AND
    (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'accountant'))
  );

-- Create payroll runs table
CREATE TABLE IF NOT EXISTS public.payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  payment_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  total_gross NUMERIC NOT NULL DEFAULT 0,
  total_tax NUMERIC NOT NULL DEFAULT 0,
  total_net NUMERIC NOT NULL DEFAULT 0,
  total_employer_cost NUMERIC NOT NULL DEFAULT 0,
  agi_file_generated BOOLEAN DEFAULT false,
  agi_file_url TEXT,
  created_by UUID NOT NULL,
  approved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;

-- Policies for payroll runs
CREATE POLICY "Users can view payroll runs for accessible companies"
  ON public.payroll_runs FOR SELECT
  USING (has_company_access(auth.uid(), company_id));

CREATE POLICY "Owners and accountants can manage payroll runs"
  ON public.payroll_runs FOR ALL
  USING (
    has_company_access(auth.uid(), company_id) AND
    (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'accountant'))
  );

-- Create payroll lines table
CREATE TABLE IF NOT EXISTS public.payroll_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id UUID NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  gross_salary NUMERIC NOT NULL,
  tax_deduction NUMERIC NOT NULL DEFAULT 0,
  net_salary NUMERIC NOT NULL,
  employer_social_fees NUMERIC NOT NULL DEFAULT 0,
  pension NUMERIC DEFAULT 0,
  vacation_pay NUMERIC DEFAULT 0,
  other_deductions NUMERIC DEFAULT 0,
  other_benefits NUMERIC DEFAULT 0,
  worked_hours NUMERIC,
  vacation_days NUMERIC DEFAULT 0,
  sick_days NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payroll_lines ENABLE ROW LEVEL SECURITY;

-- Policies for payroll lines
CREATE POLICY "Users can view payroll lines"
  ON public.payroll_lines FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.payroll_runs pr
      WHERE pr.id = payroll_lines.payroll_run_id
      AND has_company_access(auth.uid(), pr.company_id)
    )
  );

CREATE POLICY "Owners and accountants can manage payroll lines"
  ON public.payroll_lines FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.payroll_runs pr
      WHERE pr.id = payroll_lines.payroll_run_id
      AND has_company_access(auth.uid(), pr.company_id)
      AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'accountant'))
    )
  );

-- Create depreciation table for assets
CREATE TABLE IF NOT EXISTS public.fixed_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  asset_name TEXT NOT NULL,
  asset_type TEXT NOT NULL,
  acquisition_date DATE NOT NULL,
  acquisition_cost NUMERIC NOT NULL,
  residual_value NUMERIC DEFAULT 0,
  useful_life_years INTEGER NOT NULL,
  depreciation_method TEXT NOT NULL DEFAULT 'straight_line',
  account_id UUID REFERENCES public.chart_of_accounts(id),
  depreciation_account_id UUID REFERENCES public.chart_of_accounts(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fixed_assets ENABLE ROW LEVEL SECURITY;

-- Policies for fixed assets
CREATE POLICY "Users can view fixed assets for accessible companies"
  ON public.fixed_assets FOR SELECT
  USING (has_company_access(auth.uid(), company_id));

CREATE POLICY "Owners and accountants can manage fixed assets"
  ON public.fixed_assets FOR ALL
  USING (
    has_company_access(auth.uid(), company_id) AND
    (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'accountant'))
  );

-- Create depreciation entries table
CREATE TABLE IF NOT EXISTS public.depreciation_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fixed_asset_id UUID NOT NULL REFERENCES public.fixed_assets(id) ON DELETE CASCADE,
  journal_entry_id UUID REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  depreciation_amount NUMERIC NOT NULL,
  accumulated_depreciation NUMERIC NOT NULL,
  book_value NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.depreciation_entries ENABLE ROW LEVEL SECURITY;

-- Policies for depreciation entries
CREATE POLICY "Users can view depreciation entries"
  ON public.depreciation_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.fixed_assets fa
      WHERE fa.id = depreciation_entries.fixed_asset_id
      AND has_company_access(auth.uid(), fa.company_id)
    )
  );

CREATE POLICY "Accountants can manage depreciation entries"
  ON public.depreciation_entries FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.fixed_assets fa
      WHERE fa.id = depreciation_entries.fixed_asset_id
      AND has_company_access(auth.uid(), fa.company_id)
      AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'accountant'))
    )
  );

-- Create cash flow forecasts table
CREATE TABLE IF NOT EXISTS public.cash_flow_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  forecast_date DATE NOT NULL,
  opening_balance NUMERIC NOT NULL,
  predicted_income NUMERIC NOT NULL DEFAULT 0,
  predicted_expenses NUMERIC NOT NULL DEFAULT 0,
  predicted_balance NUMERIC NOT NULL,
  actual_balance NUMERIC,
  confidence_score NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, forecast_date)
);

-- Enable RLS
ALTER TABLE public.cash_flow_forecasts ENABLE ROW LEVEL SECURITY;

-- Policies for cash flow forecasts
CREATE POLICY "Users can view cash flow forecasts for accessible companies"
  ON public.cash_flow_forecasts FOR SELECT
  USING (has_company_access(auth.uid(), company_id));

CREATE POLICY "System can manage cash flow forecasts"
  ON public.cash_flow_forecasts FOR ALL
  USING (has_company_access(auth.uid(), company_id));

-- Triggers for updated_at
CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payroll_runs_updated_at
  BEFORE UPDATE ON public.payroll_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fixed_assets_updated_at
  BEFORE UPDATE ON public.fixed_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();