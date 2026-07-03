
-- AGI submissions table
CREATE TABLE public.payroll_agi_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  period TEXT NOT NULL, -- YYYY-MM
  status TEXT NOT NULL DEFAULT 'draft', -- draft, ready, submitted, error
  ai_prepared_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  submitted_by UUID,
  skv_reference_number TEXT,
  total_gross_salary NUMERIC DEFAULT 0,
  total_employer_contributions NUMERIC DEFAULT 0,
  total_tax_withheld NUMERIC DEFAULT 0,
  total_to_pay NUMERIC DEFAULT 0,
  employee_count INTEGER DEFAULT 0,
  data JSONB DEFAULT '{}'::jsonb, -- all field values per ruta-code
  warnings JSONB DEFAULT '[]'::jsonb, -- array of AI warnings
  previous_period_comparison JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, period)
);

ALTER TABLE public.payroll_agi_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view AGI submissions for their companies"
ON public.payroll_agi_submissions FOR SELECT
USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users can create AGI submissions for their companies"
ON public.payroll_agi_submissions FOR INSERT
WITH CHECK (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update AGI submissions for their companies"
ON public.payroll_agi_submissions FOR UPDATE
USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

-- AGI adjustments table
CREATE TABLE public.payroll_agi_adjustments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES public.payroll_agi_submissions(id) ON DELETE CASCADE,
  field_code TEXT NOT NULL, -- e.g. "061", "487"
  employee_id UUID, -- null for employer-level fields
  ai_value NUMERIC NOT NULL DEFAULT 0,
  adjusted_value NUMERIC NOT NULL DEFAULT 0,
  adjustment_reason TEXT,
  adjusted_by UUID NOT NULL,
  adjusted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payroll_agi_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view AGI adjustments"
ON public.payroll_agi_adjustments FOR SELECT
USING (submission_id IN (
  SELECT id FROM public.payroll_agi_submissions 
  WHERE company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid())
));

CREATE POLICY "Users can create AGI adjustments"
ON public.payroll_agi_adjustments FOR INSERT
WITH CHECK (submission_id IN (
  SELECT id FROM public.payroll_agi_submissions 
  WHERE company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid())
));

-- Trigger for updated_at
CREATE TRIGGER update_payroll_agi_submissions_updated_at
BEFORE UPDATE ON public.payroll_agi_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
