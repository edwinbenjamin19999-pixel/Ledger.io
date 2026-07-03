-- Create KYC records table for company verification
CREATE TABLE IF NOT EXISTS public.kyc_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'in_review', 'approved', 'rejected', 'additional_info_required')),
  verification_date TIMESTAMP WITH TIME ZONE,
  verified_by UUID REFERENCES auth.users(id),
  
  -- Company verification
  org_number_verified BOOLEAN DEFAULT false,
  company_name_verified BOOLEAN DEFAULT false,
  address_verified BOOLEAN DEFAULT false,
  
  -- UBO (Ultimate Beneficial Owner)
  ubo_identified BOOLEAN DEFAULT false,
  ubo_verified BOOLEAN DEFAULT false,
  ubo_data JSONB,
  
  -- Risk assessment
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')),
  risk_factors JSONB,
  
  -- Sanctions check
  sanctions_check_performed BOOLEAN DEFAULT false,
  sanctions_check_date TIMESTAMP WITH TIME ZONE,
  sanctions_check_result JSONB,
  
  -- Documentation
  verification_documents JSONB,
  
  -- BankID verification
  bankid_verified BOOLEAN DEFAULT false,
  bankid_verification_date TIMESTAMP WITH TIME ZONE,
  bankid_personal_number TEXT,
  
  -- Notes
  notes TEXT,
  rejection_reason TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  
  UNIQUE(company_id)
);

-- Enable RLS
ALTER TABLE public.kyc_records ENABLE ROW LEVEL SECURITY;

-- Owners can view and manage their company's KYC records
CREATE POLICY "Owners can manage their company KYC records"
ON public.kyc_records
FOR ALL
USING (
  has_company_access(auth.uid(), company_id) AND 
  has_role(auth.uid(), 'owner'::app_role)
);

-- Auditors can view KYC records
CREATE POLICY "Auditors can view KYC records"
ON public.kyc_records
FOR SELECT
USING (
  has_company_access(auth.uid(), company_id) AND 
  has_role(auth.uid(), 'auditor'::app_role)
);

-- Create index for faster lookups
CREATE INDEX idx_kyc_records_company_id ON public.kyc_records(company_id);
CREATE INDEX idx_kyc_records_verification_status ON public.kyc_records(verification_status);

-- Update trigger
CREATE TRIGGER update_kyc_records_updated_at
BEFORE UPDATE ON public.kyc_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add KYC status to companies table for easy access
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'not_started' CHECK (kyc_status IN ('not_started', 'pending', 'in_review', 'approved', 'rejected'));

-- Add index
CREATE INDEX IF NOT EXISTS idx_companies_kyc_status ON public.companies(kyc_status);