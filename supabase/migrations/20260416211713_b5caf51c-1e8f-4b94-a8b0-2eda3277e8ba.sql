CREATE TABLE IF NOT EXISTS public.cc_learning_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  merchant_pattern text NOT NULL,
  expense_account text NOT NULL,
  expense_account_name text,
  vat_code text,
  category text,
  hit_count integer NOT NULL DEFAULT 1,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cc_learning_rules_company ON public.cc_learning_rules(company_id);
CREATE INDEX IF NOT EXISTS idx_cc_learning_rules_pattern ON public.cc_learning_rules(company_id, merchant_pattern);

ALTER TABLE public.cc_learning_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view cc learning rules"
  ON public.cc_learning_rules FOR SELECT
  USING (
    public.has_role(auth.uid(), 'owner', company_id)
    OR public.has_role(auth.uid(), 'admin', company_id)
    OR public.has_role(auth.uid(), 'accountant', company_id)
    OR public.has_role(auth.uid(), 'cfo', company_id)
    OR public.has_role(auth.uid(), 'auditor', company_id)
  );

CREATE POLICY "Members can insert cc learning rules"
  ON public.cc_learning_rules FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'owner', company_id)
    OR public.has_role(auth.uid(), 'admin', company_id)
    OR public.has_role(auth.uid(), 'accountant', company_id)
  );

CREATE POLICY "Members can update cc learning rules"
  ON public.cc_learning_rules FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'owner', company_id)
    OR public.has_role(auth.uid(), 'admin', company_id)
    OR public.has_role(auth.uid(), 'accountant', company_id)
  );

CREATE POLICY "Members can delete cc learning rules"
  ON public.cc_learning_rules FOR DELETE
  USING (
    public.has_role(auth.uid(), 'owner', company_id)
    OR public.has_role(auth.uid(), 'admin', company_id)
  );

ALTER TABLE public.credit_card_transactions
  ADD COLUMN IF NOT EXISTS liability_account text DEFAULT '2890',
  ADD COLUMN IF NOT EXISTS vat_account text,
  ADD COLUMN IF NOT EXISTS vat_amount numeric,
  ADD COLUMN IF NOT EXISTS journal_entry_id uuid REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS confidence numeric;

CREATE INDEX IF NOT EXISTS idx_cc_txn_confidence ON public.credit_card_transactions(company_id, confidence);
CREATE INDEX IF NOT EXISTS idx_cc_txn_journal ON public.credit_card_transactions(journal_entry_id);