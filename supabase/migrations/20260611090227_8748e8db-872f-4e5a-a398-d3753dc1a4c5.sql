
DROP INDEX IF EXISTS public.imported_customers_company_number_uidx;
DROP INDEX IF EXISTS public.imported_suppliers_company_number_uidx;

CREATE UNIQUE INDEX IF NOT EXISTS imported_customers_company_number_uidx
  ON public.imported_customers (company_id, customer_number);

CREATE UNIQUE INDEX IF NOT EXISTS imported_suppliers_company_number_uidx
  ON public.imported_suppliers (company_id, supplier_number);
