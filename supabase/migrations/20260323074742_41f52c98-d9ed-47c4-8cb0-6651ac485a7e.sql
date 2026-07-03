
-- Customer & Supplier registries
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  org_number text,
  email text,
  phone text,
  address text,
  postal_code text,
  city text,
  country text DEFAULT 'SE',
  peppol_id text,
  payment_terms_days integer DEFAULT 30,
  default_account_id uuid REFERENCES public.chart_of_accounts(id),
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id)
);

CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  org_number text,
  email text,
  phone text,
  address text,
  postal_code text,
  city text,
  country text DEFAULT 'SE',
  bankgiro text,
  plusgiro text,
  iban text,
  bic text,
  default_account_id uuid REFERENCES public.chart_of_accounts(id),
  default_vat_code text,
  payment_terms_days integer DEFAULT 30,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id)
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage customers for their companies" ON public.customers
  FOR ALL TO authenticated
  USING (company_id IN (SELECT id FROM public.companies WHERE created_by = auth.uid())
    OR company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage suppliers for their companies" ON public.suppliers
  FOR ALL TO authenticated
  USING (company_id IN (SELECT id FROM public.companies WHERE created_by = auth.uid())
    OR company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));
