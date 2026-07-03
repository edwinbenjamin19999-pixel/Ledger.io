
-- CAMT.054 import tracking
CREATE TABLE public.camt054_imports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  bank_account_id UUID REFERENCES public.bank_accounts(id),
  imported_by UUID NOT NULL,
  file_name TEXT,
  transaction_count INTEGER NOT NULL DEFAULT 0,
  matched_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- CAMT.054 individual transactions
CREATE TABLE public.camt054_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  import_id UUID NOT NULL REFERENCES public.camt054_imports(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  bank_account_id UUID REFERENCES public.bank_accounts(id),
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'SEK',
  booking_date DATE NOT NULL,
  value_date DATE,
  debtor_name TEXT,
  debtor_account TEXT,
  creditor_name TEXT,
  creditor_account TEXT,
  reference TEXT,
  ocr_reference TEXT,
  description TEXT,
  transaction_type TEXT NOT NULL DEFAULT 'credit',
  end_to_end_id TEXT,
  match_type TEXT NOT NULL DEFAULT 'none',
  match_confidence NUMERIC DEFAULT 0,
  matched_invoice_id UUID REFERENCES public.invoices(id),
  status TEXT NOT NULL DEFAULT 'unmatched',
  journal_entry_id UUID REFERENCES public.journal_entries(id),
  confirmed_by UUID,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.camt054_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camt054_transactions ENABLE ROW LEVEL SECURITY;

-- Users can see imports for their companies
CREATE POLICY "Users can view their company camt054 imports"
  ON public.camt054_imports FOR SELECT TO authenticated
  USING (company_id IN (
    SELECT c.id FROM public.companies c
    JOIN public.user_roles ur ON ur.user_id = auth.uid()
    WHERE c.id = camt054_imports.company_id
  ) OR company_id IN (
    SELECT id FROM public.companies WHERE created_by = auth.uid()
  ));

CREATE POLICY "Users can insert camt054 imports"
  ON public.camt054_imports FOR INSERT TO authenticated
  WITH CHECK (company_id IN (
    SELECT id FROM public.companies WHERE created_by = auth.uid()
  ) OR company_id IN (
    SELECT c.id FROM public.companies c
    JOIN public.user_roles ur ON ur.user_id = auth.uid()
    WHERE c.id = camt054_imports.company_id
  ));

CREATE POLICY "Users can view their company camt054 transactions"
  ON public.camt054_transactions FOR SELECT TO authenticated
  USING (company_id IN (
    SELECT c.id FROM public.companies c
    JOIN public.user_roles ur ON ur.user_id = auth.uid()
    WHERE c.id = camt054_transactions.company_id
  ) OR company_id IN (
    SELECT id FROM public.companies WHERE created_by = auth.uid()
  ));

CREATE POLICY "Users can insert camt054 transactions"
  ON public.camt054_transactions FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update camt054 transactions"
  ON public.camt054_transactions FOR UPDATE TO authenticated
  USING (company_id IN (
    SELECT id FROM public.companies WHERE created_by = auth.uid()
  ) OR company_id IN (
    SELECT c.id FROM public.companies c
    JOIN public.user_roles ur ON ur.user_id = auth.uid()
    WHERE c.id = camt054_transactions.company_id
  ));
