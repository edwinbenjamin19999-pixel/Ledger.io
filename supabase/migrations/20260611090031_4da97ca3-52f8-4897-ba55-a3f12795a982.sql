
-- Make currency tolerant on imported_customers, add fields to staging tables
ALTER TABLE public.imported_customers ALTER COLUMN currency DROP NOT NULL;
ALTER TABLE public.imported_customers ALTER COLUMN currency SET DEFAULT 'SEK';
ALTER TABLE public.imported_customers ALTER COLUMN payment_terms DROP NOT NULL;
ALTER TABLE public.imported_customers ALTER COLUMN payment_terms SET DEFAULT 30;
ALTER TABLE public.imported_customers ALTER COLUMN country DROP NOT NULL;
ALTER TABLE public.imported_customers ALTER COLUMN country SET DEFAULT 'SE';

ALTER TABLE public.imported_suppliers ALTER COLUMN payment_terms DROP NOT NULL;
ALTER TABLE public.imported_suppliers ALTER COLUMN payment_terms SET DEFAULT 30;
ALTER TABLE public.imported_suppliers ALTER COLUMN country DROP NOT NULL;
ALTER TABLE public.imported_suppliers ALTER COLUMN country SET DEFAULT 'SE';

ALTER TABLE public.imported_customers ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.imported_customers ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.imported_customers ADD COLUMN IF NOT EXISTS customer_number text;

ALTER TABLE public.imported_suppliers ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.imported_suppliers ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.imported_suppliers ADD COLUMN IF NOT EXISTS supplier_number text;
ALTER TABLE public.imported_suppliers ADD COLUMN IF NOT EXISTS default_expense_account text;
ALTER TABLE public.imported_suppliers ADD COLUMN IF NOT EXISTS currency text DEFAULT 'SEK';

-- Backfill counterparty numbers from external_id where present
UPDATE public.imported_customers SET customer_number = external_id WHERE customer_number IS NULL AND external_id IS NOT NULL;
UPDATE public.imported_suppliers SET supplier_number = external_id WHERE supplier_number IS NULL AND external_id IS NOT NULL;

-- Dedupe before adding unique indexes (keep most recent row per (company,number))
DELETE FROM public.imported_customers a
USING public.imported_customers b
WHERE a.company_id = b.company_id
  AND a.customer_number IS NOT NULL
  AND a.customer_number = b.customer_number
  AND a.imported_at < b.imported_at;

DELETE FROM public.imported_suppliers a
USING public.imported_suppliers b
WHERE a.company_id = b.company_id
  AND a.supplier_number IS NOT NULL
  AND a.supplier_number = b.supplier_number
  AND a.imported_at < b.imported_at;

CREATE UNIQUE INDEX IF NOT EXISTS imported_customers_company_number_uidx
  ON public.imported_customers (company_id, customer_number)
  WHERE customer_number IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS imported_suppliers_company_number_uidx
  ON public.imported_suppliers (company_id, supplier_number)
  WHERE supplier_number IS NOT NULL;
