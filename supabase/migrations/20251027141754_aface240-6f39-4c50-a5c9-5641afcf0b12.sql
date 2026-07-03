-- Create table for Skatteverket API credentials
CREATE TABLE public.skatteverket_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  client_secret_encrypted TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT 'test', -- 'test' or 'production'
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, environment)
);

-- Create table for AGI reporting periods
CREATE TABLE public.agi_periods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  period_type TEXT NOT NULL DEFAULT 'monthly', -- 'monthly', 'quarterly', 'annual'
  status TEXT NOT NULL DEFAULT 'open', -- 'open', 'submitted', 'accepted', 'rejected'
  skatteverket_period_id TEXT,
  payroll_run_id UUID REFERENCES public.payroll_runs(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, period_year, period_month)
);

-- Create table for AGI submissions
CREATE TABLE public.agi_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  agi_period_id UUID NOT NULL REFERENCES public.agi_periods(id) ON DELETE CASCADE,
  payroll_run_id UUID NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  submission_type TEXT NOT NULL, -- 'individuals', 'final_submission'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'submitted', 'accepted', 'rejected', 'failed'
  skatteverket_reference TEXT,
  submission_data JSONB NOT NULL,
  response_data JSONB,
  error_message TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE,
  submitted_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.skatteverket_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agi_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agi_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for skatteverket_credentials
CREATE POLICY "Owners can manage Skatteverket credentials"
ON public.skatteverket_credentials
FOR ALL
USING (
  has_company_access(auth.uid(), company_id) 
  AND has_role(auth.uid(), 'owner'::app_role)
);

CREATE POLICY "Users can view Skatteverket credentials for accessible companies"
ON public.skatteverket_credentials
FOR SELECT
USING (has_company_access(auth.uid(), company_id));

-- RLS Policies for agi_periods
CREATE POLICY "Owners and accountants can manage AGI periods"
ON public.agi_periods
FOR ALL
USING (
  has_company_access(auth.uid(), company_id) 
  AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'accountant'::app_role))
);

CREATE POLICY "Users can view AGI periods for accessible companies"
ON public.agi_periods
FOR SELECT
USING (has_company_access(auth.uid(), company_id));

-- RLS Policies for agi_submissions
CREATE POLICY "Owners and accountants can manage AGI submissions"
ON public.agi_submissions
FOR ALL
USING (
  has_company_access(auth.uid(), company_id) 
  AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'accountant'::app_role))
);

CREATE POLICY "Users can view AGI submissions for accessible companies"
ON public.agi_submissions
FOR SELECT
USING (has_company_access(auth.uid(), company_id));

-- Create indexes
CREATE INDEX idx_skatteverket_credentials_company ON public.skatteverket_credentials(company_id);
CREATE INDEX idx_agi_periods_company ON public.agi_periods(company_id);
CREATE INDEX idx_agi_periods_status ON public.agi_periods(status);
CREATE INDEX idx_agi_submissions_company ON public.agi_submissions(company_id);
CREATE INDEX idx_agi_submissions_period ON public.agi_submissions(agi_period_id);
CREATE INDEX idx_agi_submissions_payroll ON public.agi_submissions(payroll_run_id);
CREATE INDEX idx_agi_submissions_status ON public.agi_submissions(status);

-- Trigger for updated_at
CREATE TRIGGER update_skatteverket_credentials_updated_at
BEFORE UPDATE ON public.skatteverket_credentials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agi_periods_updated_at
BEFORE UPDATE ON public.agi_periods
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agi_submissions_updated_at
BEFORE UPDATE ON public.agi_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();