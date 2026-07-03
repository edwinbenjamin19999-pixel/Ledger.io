-- Track Open Banking PIS-initiated payments (e.g. F-skatt direktbetalning)
CREATE TABLE IF NOT EXISTS public.bank_payment_initiations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  bank_account_id uuid NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'enable_banking',
  external_payment_id text,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'SEK',
  execution_date date NOT NULL,
  creditor_account text NOT NULL,
  creditor_name text,
  reference text NOT NULL,
  purpose text NOT NULL DEFAULT 'preliminary_tax',
  status text NOT NULL DEFAULT 'pending',
  auth_url text,
  journal_entry_id uuid REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  raw_response jsonb,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bank_payment_initiations_company
  ON public.bank_payment_initiations(company_id);
CREATE INDEX IF NOT EXISTS idx_bank_payment_initiations_status
  ON public.bank_payment_initiations(status);

ALTER TABLE public.bank_payment_initiations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners and accountants can view payment initiations"
  ON public.bank_payment_initiations FOR SELECT
  TO authenticated
  USING (
    has_company_access(auth.uid(), company_id)
    AND (
      has_role(auth.uid(), 'owner'::app_role, company_id)
      OR has_role(auth.uid(), 'accountant'::app_role, company_id)
    )
  );

CREATE POLICY "Owners and accountants can manage payment initiations"
  ON public.bank_payment_initiations FOR ALL
  TO authenticated
  USING (
    has_company_access(auth.uid(), company_id)
    AND (
      has_role(auth.uid(), 'owner'::app_role, company_id)
      OR has_role(auth.uid(), 'accountant'::app_role, company_id)
    )
  )
  WITH CHECK (
    has_company_access(auth.uid(), company_id)
    AND (
      has_role(auth.uid(), 'owner'::app_role, company_id)
      OR has_role(auth.uid(), 'accountant'::app_role, company_id)
    )
  );

CREATE TRIGGER update_bank_payment_initiations_updated_at
  BEFORE UPDATE ON public.bank_payment_initiations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();