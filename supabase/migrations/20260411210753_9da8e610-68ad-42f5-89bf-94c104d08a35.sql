CREATE TABLE IF NOT EXISTS public.tax_account_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('inbetalning','utbetalning','ränta','avgift','deklaration')),
  amount NUMERIC(15,2) NOT NULL,
  description TEXT,
  reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tax_account_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tax_account_entries_select" ON public.tax_account_entries
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid())
  );

CREATE POLICY "tax_account_entries_insert" ON public.tax_account_entries
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid())
  );

CREATE POLICY "tax_account_entries_update" ON public.tax_account_entries
  FOR UPDATE USING (
    company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid())
  );

CREATE POLICY "tax_account_entries_delete" ON public.tax_account_entries
  FOR DELETE USING (
    company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid())
  );

CREATE INDEX idx_tax_account_entries_company ON public.tax_account_entries(company_id, entry_date);