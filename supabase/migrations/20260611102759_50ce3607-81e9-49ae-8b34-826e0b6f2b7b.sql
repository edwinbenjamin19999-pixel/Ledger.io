
-- Drop previous partial indexes if present
DROP INDEX IF EXISTS public.customers_company_number_key;
DROP INDEX IF EXISTS public.suppliers_company_number_key;
DROP INDEX IF EXISTS public.customers_company_id_customer_number_key;
DROP INDEX IF EXISTS public.suppliers_company_id_supplier_number_key;
DROP INDEX IF EXISTS public.uniq_customers_company_customer_number;
DROP INDEX IF EXISTS public.uniq_suppliers_company_supplier_number;

-- Deduplicate customers (keep latest updated_at)
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY company_id, customer_number
           ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
         ) AS rn
  FROM public.customers
  WHERE customer_number IS NOT NULL
)
DELETE FROM public.customers
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Deduplicate suppliers
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY company_id, supplier_number
           ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST
         ) AS rn
  FROM public.suppliers
  WHERE supplier_number IS NOT NULL
)
DELETE FROM public.suppliers
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Create plain unique indexes (NULLs do not conflict)
CREATE UNIQUE INDEX customers_company_number_key
  ON public.customers (company_id, customer_number);

CREATE UNIQUE INDEX suppliers_company_number_key
  ON public.suppliers (company_id, supplier_number);
