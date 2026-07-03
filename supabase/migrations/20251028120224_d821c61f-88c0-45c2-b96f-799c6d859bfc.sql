-- Create table for storing tax agency mandates/delegations
CREATE TABLE IF NOT EXISTS public.tax_mandates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Mandate details
  mandate_type TEXT NOT NULL CHECK (mandate_type IN ('agi', 'vat', 'full')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked', 'expired')),
  
  -- Skatteverket integration
  skatteverket_mandate_id TEXT,
  skatteverket_status TEXT,
  
  -- User consent
  consent_given_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  consent_ip_address TEXT,
  consent_text TEXT NOT NULL,
  
  -- Validity period
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until TIMESTAMPTZ,
  
  -- Revocation
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id),
  revocation_reason TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(company_id, mandate_type)
);

-- Enable RLS
ALTER TABLE public.tax_mandates ENABLE ROW LEVEL SECURITY;

-- Users can view their own company's mandates
CREATE POLICY "Users can view their company mandates"
  ON public.tax_mandates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND company_id = tax_mandates.company_id
    )
  );

-- Company owners can create mandates
CREATE POLICY "Owners can create mandates"
  ON public.tax_mandates
  FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'owner', company_id)
  );

-- Company owners can update mandates
CREATE POLICY "Owners can update mandates"
  ON public.tax_mandates
  FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'owner', company_id)
  );

-- Add mandate acceptance to companies table
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS tax_mandate_accepted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tax_mandate_accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS tax_mandate_accepted_by UUID REFERENCES auth.users(id);

-- Create updated_at trigger for tax_mandates
CREATE TRIGGER update_tax_mandates_updated_at
  BEFORE UPDATE ON public.tax_mandates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_tax_mandates_company_id ON public.tax_mandates(company_id);
CREATE INDEX idx_tax_mandates_status ON public.tax_mandates(status);
CREATE INDEX idx_tax_mandates_skatteverket_id ON public.tax_mandates(skatteverket_mandate_id);