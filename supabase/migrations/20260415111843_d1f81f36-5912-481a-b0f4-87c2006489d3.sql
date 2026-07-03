
-- Credit card statements
CREATE TABLE public.credit_card_statements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  file_name TEXT,
  file_url TEXT,
  statement_period_start DATE,
  statement_period_end DATE,
  total_amount NUMERIC DEFAULT 0,
  card_issuer TEXT,
  status TEXT NOT NULL DEFAULT 'imported',
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_card_statements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cc_statements_select" ON public.credit_card_statements FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin'::app_role, company_id)
    OR public.has_role(auth.uid(), 'owner'::app_role, company_id)
    OR public.has_role(auth.uid(), 'accountant'::app_role, company_id)
    OR public.has_role(auth.uid(), 'cfo'::app_role, company_id)
    OR public.has_role(auth.uid(), 'limited_user'::app_role, company_id)
  );

CREATE POLICY "cc_statements_modify" ON public.credit_card_statements FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin'::app_role, company_id)
    OR public.has_role(auth.uid(), 'owner'::app_role, company_id)
    OR public.has_role(auth.uid(), 'accountant'::app_role, company_id)
    OR public.has_role(auth.uid(), 'cfo'::app_role, company_id)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role, company_id)
    OR public.has_role(auth.uid(), 'owner'::app_role, company_id)
    OR public.has_role(auth.uid(), 'accountant'::app_role, company_id)
    OR public.has_role(auth.uid(), 'cfo'::app_role, company_id)
  );

-- Credit card transactions
CREATE TABLE public.credit_card_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  statement_id UUID REFERENCES public.credit_card_statements(id) ON DELETE SET NULL,
  transaction_date DATE NOT NULL,
  merchant_name TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'SEK',
  category_hint TEXT,
  raw_text TEXT,
  match_status TEXT NOT NULL DEFAULT 'unmatched',
  match_confidence NUMERIC DEFAULT 0,
  matched_receipt_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  matched_journal_entry_id UUID REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  ai_suggestion JSONB,
  clarification_question TEXT,
  clarification_answer TEXT,
  is_private BOOLEAN NOT NULL DEFAULT false,
  is_duplicate BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_card_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cc_transactions_select" ON public.credit_card_transactions FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin'::app_role, company_id)
    OR public.has_role(auth.uid(), 'owner'::app_role, company_id)
    OR public.has_role(auth.uid(), 'accountant'::app_role, company_id)
    OR public.has_role(auth.uid(), 'cfo'::app_role, company_id)
    OR public.has_role(auth.uid(), 'limited_user'::app_role, company_id)
  );

CREATE POLICY "cc_transactions_modify" ON public.credit_card_transactions FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin'::app_role, company_id)
    OR public.has_role(auth.uid(), 'owner'::app_role, company_id)
    OR public.has_role(auth.uid(), 'accountant'::app_role, company_id)
    OR public.has_role(auth.uid(), 'cfo'::app_role, company_id)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role, company_id)
    OR public.has_role(auth.uid(), 'owner'::app_role, company_id)
    OR public.has_role(auth.uid(), 'accountant'::app_role, company_id)
    OR public.has_role(auth.uid(), 'cfo'::app_role, company_id)
  );

CREATE INDEX idx_cc_transactions_company ON public.credit_card_transactions(company_id);
CREATE INDEX idx_cc_transactions_status ON public.credit_card_transactions(status);
CREATE INDEX idx_cc_transactions_match ON public.credit_card_transactions(match_status);
CREATE INDEX idx_cc_transactions_date ON public.credit_card_transactions(transaction_date);

-- Credit card settings
CREATE TABLE public.credit_card_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE UNIQUE,
  default_liability_account TEXT NOT NULL DEFAULT '2890',
  preferred_mode TEXT NOT NULL DEFAULT 'purchase_level',
  auto_approve_threshold NUMERIC NOT NULL DEFAULT 0.95,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_card_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cc_settings_select" ON public.credit_card_settings FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin'::app_role, company_id)
    OR public.has_role(auth.uid(), 'owner'::app_role, company_id)
    OR public.has_role(auth.uid(), 'accountant'::app_role, company_id)
    OR public.has_role(auth.uid(), 'cfo'::app_role, company_id)
  );

CREATE POLICY "cc_settings_modify" ON public.credit_card_settings FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin'::app_role, company_id)
    OR public.has_role(auth.uid(), 'owner'::app_role, company_id)
    OR public.has_role(auth.uid(), 'accountant'::app_role, company_id)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role, company_id)
    OR public.has_role(auth.uid(), 'owner'::app_role, company_id)
    OR public.has_role(auth.uid(), 'accountant'::app_role, company_id)
  );
