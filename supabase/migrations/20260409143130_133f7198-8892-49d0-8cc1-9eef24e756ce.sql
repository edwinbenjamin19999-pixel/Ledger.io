CREATE TABLE public.tax_reserves (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('periodiseringsfond', 'expansionsfond')),
  year_set INTEGER NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  account_number TEXT,
  must_reverse_by DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'reversed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tax_reserves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tax reserves for their companies"
  ON public.tax_reserves FOR SELECT TO authenticated
  USING (company_id IN (
    SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage tax reserves for their companies"
  ON public.tax_reserves FOR ALL TO authenticated
  USING (company_id IN (
    SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid()
  ));

CREATE INDEX idx_tax_reserves_company ON public.tax_reserves(company_id, type, status);