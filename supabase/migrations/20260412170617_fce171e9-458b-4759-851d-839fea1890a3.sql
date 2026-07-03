
-- Create vat_periods table
CREATE TABLE IF NOT EXISTS public.vat_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('monthly', 'quarterly', 'yearly')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'corrected')),
  submitted_at TIMESTAMPTZ,
  reference_number TEXT,
  ruta_values JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, period_start, period_type)
);

ALTER TABLE public.vat_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company vat_periods"
  ON public.vat_periods FOR SELECT
  USING (company_id IN (
    SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert company vat_periods"
  ON public.vat_periods FOR INSERT
  WITH CHECK (company_id IN (
    SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid()
  ));

CREATE POLICY "Users can update company vat_periods"
  ON public.vat_periods FOR UPDATE
  USING (company_id IN (
    SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid()
  ));

-- Add VAT settings to companies
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS vat_period_type TEXT DEFAULT 'quarterly';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS vat_liable_from DATE;
