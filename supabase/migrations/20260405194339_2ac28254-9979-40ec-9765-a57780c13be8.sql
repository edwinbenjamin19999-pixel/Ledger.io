
CREATE TABLE public.expense_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  approver_id UUID REFERENCES auth.users(id),
  description TEXT NOT NULL DEFAULT '',
  category TEXT,
  country TEXT DEFAULT 'Sverige',
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_date DATE,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  vat_amount NUMERIC(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'SEK',
  cost_center TEXT,
  project TEXT,
  memo TEXT,
  payment_method TEXT DEFAULT 'employee' CHECK (payment_method IN ('company','employee')),
  billable BOOLEAN DEFAULT false,
  account_number TEXT,
  vat_code TEXT DEFAULT '25',
  ai_confidence NUMERIC(3,2),
  ai_suggested_account TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_approval','approved','rejected','paid','paid_via_salary')),
  journal_entry_id UUID REFERENCES public.journal_entries(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.expense_claim_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_claim_id UUID NOT NULL REFERENCES public.expense_claims(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.expense_claim_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  expense_claim_id UUID NOT NULL REFERENCES public.expense_claims(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_expense_claims_company ON public.expense_claims(company_id);
CREATE INDEX idx_expense_claims_user ON public.expense_claims(user_id);
CREATE INDEX idx_expense_claims_status ON public.expense_claims(status);
CREATE INDEX idx_expense_claim_files_claim ON public.expense_claim_files(expense_claim_id);
CREATE INDEX idx_expense_claim_comments_claim ON public.expense_claim_comments(expense_claim_id);

ALTER TABLE public.expense_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_claim_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_claim_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view expense claims in their companies"
  ON public.expense_claims FOR SELECT TO authenticated
  USING (
    company_id IN (SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid())
    OR user_id = auth.uid()
  );

CREATE POLICY "Users can create expense claims"
  ON public.expense_claims FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own or assigned claims"
  ON public.expense_claims FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR approver_id = auth.uid()
    OR public.has_role(auth.uid(), 'owner', company_id)
  );

CREATE POLICY "Owner or creator can delete expense claims"
  ON public.expense_claims FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'owner', company_id)
  );

CREATE POLICY "Users can view files for accessible claims"
  ON public.expense_claim_files FOR SELECT TO authenticated
  USING (expense_claim_id IN (SELECT id FROM public.expense_claims));

CREATE POLICY "Users can upload files to own claims"
  ON public.expense_claim_files FOR INSERT TO authenticated
  WITH CHECK (expense_claim_id IN (SELECT id FROM public.expense_claims WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own files"
  ON public.expense_claim_files FOR DELETE TO authenticated
  USING (expense_claim_id IN (SELECT id FROM public.expense_claims WHERE user_id = auth.uid()));

CREATE POLICY "Users can view comments for accessible claims"
  ON public.expense_claim_comments FOR SELECT TO authenticated
  USING (expense_claim_id IN (SELECT id FROM public.expense_claims));

CREATE POLICY "Authenticated users can add comments"
  ON public.expense_claim_comments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

INSERT INTO storage.buckets (id, name, public) VALUES ('expense-receipts', 'expense-receipts', false)
ON CONFLICT DO NOTHING;

CREATE POLICY "Users can upload expense receipts"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'expense-receipts');

CREATE POLICY "Users can view expense receipts"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'expense-receipts');
