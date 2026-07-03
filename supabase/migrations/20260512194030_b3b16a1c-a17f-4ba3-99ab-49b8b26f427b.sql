
-- ── Extend customers ──
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS vat_number text,
  ADD COLUMN IF NOT EXISTS customer_id_label text,
  ADD COLUMN IF NOT EXISTS general_email text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS street text,
  ADD COLUMN IF NOT EXISTS credit_limit numeric,
  ADD COLUMN IF NOT EXISTS default_vat_rate integer DEFAULT 25,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'SEK',
  ADD COLUMN IF NOT EXISTS default_revenue_account_id uuid REFERENCES public.chart_of_accounts(id),
  ADD COLUMN IF NOT EXISTS vat_account_id uuid REFERENCES public.chart_of_accounts(id),
  ADD COLUMN IF NOT EXISTS invoice_delivery text DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS price_list_id uuid,
  ADD COLUMN IF NOT EXISTS discount_pct numeric,
  ADD COLUMN IF NOT EXISTS internal_reference text;

-- ── Extend suppliers ──
ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS vat_number text,
  ADD COLUMN IF NOT EXISTS supplier_id_label text,
  ADD COLUMN IF NOT EXISTS peppol_id text,
  ADD COLUMN IF NOT EXISTS gln text,
  ADD COLUMN IF NOT EXISTS general_email text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS street text,
  ADD COLUMN IF NOT EXISTS default_vat_rate integer DEFAULT 25,
  ADD COLUMN IF NOT EXISTS default_expense_account_id uuid REFERENCES public.chart_of_accounts(id),
  ADD COLUMN IF NOT EXISTS vat_account_id uuid REFERENCES public.chart_of_accounts(id),
  ADD COLUMN IF NOT EXISTS internal_reference text;

-- ── New shared contacts table ──
CREATE TABLE IF NOT EXISTS public.counterparty_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_type text NOT NULL CHECK (parent_type IN ('customer','supplier')),
  parent_id uuid NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  title text,
  email text,
  phone text,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS counterparty_contacts_parent_idx
  ON public.counterparty_contacts(parent_type, parent_id);
CREATE INDEX IF NOT EXISTS counterparty_contacts_company_idx
  ON public.counterparty_contacts(company_id);

ALTER TABLE public.counterparty_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage contacts for their companies" ON public.counterparty_contacts;
CREATE POLICY "Users can manage contacts for their companies"
  ON public.counterparty_contacts
  FOR ALL
  TO authenticated
  USING (
    company_id IN (SELECT id FROM public.companies WHERE created_by = auth.uid())
    OR company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    company_id IN (SELECT id FROM public.companies WHERE created_by = auth.uid())
    OR company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid())
  );

-- updated_at trigger
DROP TRIGGER IF EXISTS counterparty_contacts_updated_at ON public.counterparty_contacts;
CREATE TRIGGER counterparty_contacts_updated_at
  BEFORE UPDATE ON public.counterparty_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
