
CREATE TABLE public.migration_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  source_system TEXT NOT NULL,
  source_format TEXT NOT NULL CHECK (source_format IN ('sie4', 'csv', 'excel', 'api')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending','uploading','analyzing','mapping','preview','importing','validating','complete','failed'
  )),
  transition_date DATE,
  stats JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_report TEXT,
  errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX idx_migration_jobs_company ON public.migration_jobs(company_id);

CREATE TABLE public.imported_customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  migration_job_id UUID REFERENCES public.migration_jobs(id) ON DELETE SET NULL,
  external_id TEXT,
  name TEXT NOT NULL,
  org_number TEXT,
  vat_number TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  postal_code TEXT,
  city TEXT,
  country TEXT NOT NULL DEFAULT 'SE',
  payment_terms INTEGER NOT NULL DEFAULT 30,
  currency TEXT NOT NULL DEFAULT 'SEK',
  source_system TEXT,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, org_number)
);
CREATE INDEX idx_imported_customers_company ON public.imported_customers(company_id);
CREATE INDEX idx_imported_customers_job ON public.imported_customers(migration_job_id);

CREATE TABLE public.imported_suppliers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  migration_job_id UUID REFERENCES public.migration_jobs(id) ON DELETE SET NULL,
  external_id TEXT,
  name TEXT NOT NULL,
  org_number TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  postal_code TEXT,
  city TEXT,
  country TEXT NOT NULL DEFAULT 'SE',
  bankgiro TEXT,
  plusgiro TEXT,
  iban TEXT,
  bic TEXT,
  payment_terms INTEGER NOT NULL DEFAULT 30,
  source_system TEXT,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, org_number)
);
CREATE INDEX idx_imported_suppliers_company ON public.imported_suppliers(company_id);
CREATE INDEX idx_imported_suppliers_job ON public.imported_suppliers(migration_job_id);

CREATE TABLE public.imported_customer_invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  migration_job_id UUID REFERENCES public.migration_jobs(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.imported_customers(id) ON DELETE SET NULL,
  external_invoice_number TEXT,
  invoice_date DATE NOT NULL,
  due_date DATE,
  amount_excl_vat NUMERIC(15,2) NOT NULL,
  vat_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  amount_incl_vat NUMERIC(15,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'SEK',
  status TEXT CHECK (status IN ('paid','unpaid','overdue','cancelled','credited')),
  paid_date DATE,
  description TEXT,
  our_reference TEXT,
  source_system TEXT,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_imp_cust_inv_company ON public.imported_customer_invoices(company_id);
CREATE INDEX idx_imp_cust_inv_customer ON public.imported_customer_invoices(customer_id);

CREATE TABLE public.imported_supplier_invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  migration_job_id UUID REFERENCES public.migration_jobs(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES public.imported_suppliers(id) ON DELETE SET NULL,
  external_invoice_number TEXT,
  invoice_date DATE NOT NULL,
  due_date DATE,
  amount_excl_vat NUMERIC(15,2) NOT NULL,
  vat_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  amount_incl_vat NUMERIC(15,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'SEK',
  status TEXT CHECK (status IN ('paid','unpaid','overdue','cancelled')),
  paid_date DATE,
  account_code TEXT,
  description TEXT,
  source_system TEXT,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_imp_supp_inv_company ON public.imported_supplier_invoices(company_id);
CREATE INDEX idx_imp_supp_inv_supplier ON public.imported_supplier_invoices(supplier_id);

CREATE TABLE public.opening_balances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  migration_job_id UUID REFERENCES public.migration_jobs(id) ON DELETE SET NULL,
  transition_date DATE NOT NULL,
  account_code TEXT NOT NULL,
  account_name TEXT,
  balance NUMERIC(15,2) NOT NULL,
  balance_type TEXT CHECK (balance_type IN ('debit','credit')),
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, transition_date, account_code)
);
CREATE INDEX idx_opening_balances_company ON public.opening_balances(company_id);

CREATE TABLE public.account_mapping (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  migration_job_id UUID REFERENCES public.migration_jobs(id) ON DELETE CASCADE,
  source_account_code TEXT NOT NULL,
  source_account_name TEXT,
  target_account_code TEXT NOT NULL,
  target_account_name TEXT,
  confidence INTEGER,
  confirmed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_account_mapping_job ON public.account_mapping(migration_job_id);

ALTER TABLE public.migration_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imported_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imported_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imported_customer_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imported_supplier_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opening_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_mapping ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'migration_jobs','imported_customers','imported_suppliers',
    'imported_customer_invoices','imported_supplier_invoices',
    'opening_balances','account_mapping'
  ]
  LOOP
    EXECUTE format($f$
      CREATE POLICY "Company members can view %1$s"
        ON public.%1$I FOR SELECT
        USING (
          public.has_role(auth.uid(), 'admin'::public.app_role)
          OR EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid() AND ur.company_id = %1$I.company_id
          )
        );
    $f$, t);

    EXECUTE format($f$
      CREATE POLICY "Company members can insert %1$s"
        ON public.%1$I FOR INSERT
        WITH CHECK (
          public.has_role(auth.uid(), 'admin'::public.app_role)
          OR EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid() AND ur.company_id = %1$I.company_id
          )
        );
    $f$, t);

    EXECUTE format($f$
      CREATE POLICY "Company members can update %1$s"
        ON public.%1$I FOR UPDATE
        USING (
          public.has_role(auth.uid(), 'admin'::public.app_role)
          OR EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid() AND ur.company_id = %1$I.company_id
          )
        );
    $f$, t);

    EXECUTE format($f$
      CREATE POLICY "Company members can delete %1$s"
        ON public.%1$I FOR DELETE
        USING (
          public.has_role(auth.uid(), 'admin'::public.app_role)
          OR EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid() AND ur.company_id = %1$I.company_id
          )
        );
    $f$, t);
  END LOOP;
END $$;
