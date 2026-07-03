-- Deduplicate customers
WITH dupes AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY company_id, customer_number
    ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
  ) AS rn
  FROM public.customers
  WHERE customer_number IS NOT NULL
)
DELETE FROM public.customers WHERE id IN (SELECT id FROM dupes WHERE rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS customers_company_id_customer_number_uidx
  ON public.customers (company_id, customer_number)
  WHERE customer_number IS NOT NULL;

-- Deduplicate suppliers
WITH dupes AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY company_id, supplier_number
    ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
  ) AS rn
  FROM public.suppliers
  WHERE supplier_number IS NOT NULL
)
DELETE FROM public.suppliers WHERE id IN (SELECT id FROM dupes WHERE rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS suppliers_company_id_supplier_number_uidx
  ON public.suppliers (company_id, supplier_number)
  WHERE supplier_number IS NOT NULL;