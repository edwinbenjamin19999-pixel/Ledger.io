-- =====================================================
-- FULL AUTOMATION SUPPORT: AGI, VAT, ANNUAL REPORTS
-- =====================================================

-- 1. VAT Declarations table
CREATE TABLE IF NOT EXISTS public.vat_declarations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  period_year INT NOT NULL,
  period_month INT, -- NULL for quarterly/yearly
  period_quarter INT, -- 1-4 for quarterly reporting
  period_type TEXT NOT NULL DEFAULT 'monthly' CHECK (period_type IN ('monthly', 'quarterly', 'yearly')),
  
  -- VAT amounts
  sales_25_percent NUMERIC(15,2) DEFAULT 0,
  sales_12_percent NUMERIC(15,2) DEFAULT 0,
  sales_6_percent NUMERIC(15,2) DEFAULT 0,
  sales_0_percent NUMERIC(15,2) DEFAULT 0,
  eu_sales NUMERIC(15,2) DEFAULT 0,
  eu_purchases NUMERIC(15,2) DEFAULT 0,
  import_purchases NUMERIC(15,2) DEFAULT 0,
  
  -- Calculated VAT
  output_vat_25 NUMERIC(15,2) DEFAULT 0,
  output_vat_12 NUMERIC(15,2) DEFAULT 0,
  output_vat_6 NUMERIC(15,2) DEFAULT 0,
  input_vat NUMERIC(15,2) DEFAULT 0,
  vat_to_pay NUMERIC(15,2) DEFAULT 0, -- Negative = refund
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'submitted', 'accepted', 'rejected')),
  calculated_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  submitted_at TIMESTAMPTZ,
  submitted_by UUID REFERENCES auth.users(id),
  
  -- Skatteverket integration
  skatteverket_reference TEXT,
  skatteverket_response JSONB,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(company_id, period_year, period_month, period_quarter, period_type)
);

-- 2. Annual Reports / Bokslut table
CREATE TABLE IF NOT EXISTS public.annual_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  fiscal_year INT NOT NULL,
  fiscal_year_start DATE NOT NULL,
  fiscal_year_end DATE NOT NULL,
  
  -- Report type
  report_type TEXT NOT NULL DEFAULT 'k2' CHECK (report_type IN ('k2', 'k3', 'k4')),
  
  -- Balance sheet data (stored as JSONB for flexibility)
  balance_sheet JSONB,
  income_statement JSONB,
  notes JSONB,
  
  -- Key figures
  total_assets NUMERIC(15,2),
  total_equity NUMERIC(15,2),
  total_liabilities NUMERIC(15,2),
  revenue NUMERIC(15,2),
  net_profit NUMERIC(15,2),
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'pending_approval', 'approved', 'submitted_skv', 'submitted_bv', 'completed')),
  
  -- Approval workflow
  prepared_by UUID REFERENCES auth.users(id),
  prepared_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  
  -- Submission tracking
  skatteverket_submitted_at TIMESTAMPTZ,
  skatteverket_reference TEXT,
  skatteverket_status TEXT,
  bolagsverket_submitted_at TIMESTAMPTZ,
  bolagsverket_reference TEXT,
  bolagsverket_status TEXT,
  
  -- PDF storage
  pdf_url TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(company_id, fiscal_year)
);

-- 3. Automation Tasks - Track all automated tasks
CREATE TABLE IF NOT EXISTS public.automation_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Task type
  task_type TEXT NOT NULL CHECK (task_type IN ('agi_submission', 'vat_declaration', 'annual_report', 'bank_sync', 'invoice_reminder', 'payroll_generation')),
  
  -- Related entity
  related_entity_type TEXT,
  related_entity_id UUID,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready_for_approval', 'approved', 'processing', 'completed', 'failed', 'cancelled')),
  
  -- Scheduling
  scheduled_for TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- One-click approval data
  prepared_data JSONB, -- AI-prepared data ready for approval
  approval_summary TEXT, -- Human-readable summary for approval
  
  -- Execution details
  result_data JSONB,
  error_message TEXT,
  retry_count INT DEFAULT 0,
  
  -- User interaction
  requires_approval BOOLEAN DEFAULT true,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Automation Settings per company
CREATE TABLE IF NOT EXISTS public.automation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE UNIQUE,
  
  -- AGI settings
  agi_auto_prepare BOOLEAN DEFAULT true,
  agi_auto_submit BOOLEAN DEFAULT false, -- Requires approval by default
  agi_reminder_days_before INT DEFAULT 5,
  
  -- VAT settings
  vat_period_type TEXT DEFAULT 'monthly' CHECK (vat_period_type IN ('monthly', 'quarterly', 'yearly')),
  vat_auto_prepare BOOLEAN DEFAULT true,
  vat_auto_submit BOOLEAN DEFAULT false,
  vat_reminder_days_before INT DEFAULT 5,
  
  -- Annual report settings
  annual_report_type TEXT DEFAULT 'k2' CHECK (annual_report_type IN ('k2', 'k3', 'k4')),
  annual_report_auto_prepare BOOLEAN DEFAULT true,
  
  -- General settings
  notify_on_completion BOOLEAN DEFAULT true,
  notify_email TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Enable RLS
ALTER TABLE public.vat_declarations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annual_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_settings ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for vat_declarations
CREATE POLICY "Users can view their company VAT declarations"
  ON public.vat_declarations FOR SELECT
  USING (public.has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can create VAT declarations for their company"
  ON public.vat_declarations FOR INSERT
  WITH CHECK (public.has_company_access(auth.uid(), company_id));

CREATE POLICY "Owners and accountants can update VAT declarations"
  ON public.vat_declarations FOR UPDATE
  USING (
    public.has_company_access(auth.uid(), company_id) AND
    (public.has_role(auth.uid(), 'owner', company_id) OR public.has_role(auth.uid(), 'accountant', company_id))
  );

-- 7. RLS Policies for annual_reports
CREATE POLICY "Users can view their company annual reports"
  ON public.annual_reports FOR SELECT
  USING (public.has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can create annual reports for their company"
  ON public.annual_reports FOR INSERT
  WITH CHECK (public.has_company_access(auth.uid(), company_id));

CREATE POLICY "Owners and accountants can update annual reports"
  ON public.annual_reports FOR UPDATE
  USING (
    public.has_company_access(auth.uid(), company_id) AND
    (public.has_role(auth.uid(), 'owner', company_id) OR public.has_role(auth.uid(), 'accountant', company_id))
  );

-- 8. RLS Policies for automation_tasks
CREATE POLICY "Users can view their company automation tasks"
  ON public.automation_tasks FOR SELECT
  USING (public.has_company_access(auth.uid(), company_id));

CREATE POLICY "System can create automation tasks"
  ON public.automation_tasks FOR INSERT
  WITH CHECK (public.has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can update their company automation tasks"
  ON public.automation_tasks FOR UPDATE
  USING (public.has_company_access(auth.uid(), company_id));

-- 9. RLS Policies for automation_settings
CREATE POLICY "Users can view their company automation settings"
  ON public.automation_settings FOR SELECT
  USING (public.has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can create automation settings"
  ON public.automation_settings FOR INSERT
  WITH CHECK (public.has_company_access(auth.uid(), company_id));

CREATE POLICY "Owners can update automation settings"
  ON public.automation_settings FOR UPDATE
  USING (
    public.has_company_access(auth.uid(), company_id) AND
    public.has_role(auth.uid(), 'owner', company_id)
  );

-- 10. Update triggers
CREATE TRIGGER update_vat_declarations_updated_at
  BEFORE UPDATE ON public.vat_declarations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_annual_reports_updated_at
  BEFORE UPDATE ON public.annual_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_automation_tasks_updated_at
  BEFORE UPDATE ON public.automation_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_automation_settings_updated_at
  BEFORE UPDATE ON public.automation_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 11. Create default automation settings for existing companies
INSERT INTO public.automation_settings (company_id)
SELECT id FROM public.companies
ON CONFLICT (company_id) DO NOTHING;

-- 12. Trigger to create automation settings for new companies
CREATE OR REPLACE FUNCTION public.create_automation_settings_for_new_company()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.automation_settings (company_id)
  VALUES (NEW.id)
  ON CONFLICT (company_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER create_automation_settings_on_company_create
  AFTER INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.create_automation_settings_for_new_company();