
-- Add registry source-of-truth columns to customers and suppliers
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS customer_number text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';

ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS supplier_number text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS default_expense_account text;

CREATE UNIQUE INDEX IF NOT EXISTS customers_company_customer_number_uniq
  ON public.customers (company_id, customer_number)
  WHERE customer_number IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS suppliers_company_supplier_number_uniq
  ON public.suppliers (company_id, supplier_number)
  WHERE supplier_number IS NOT NULL;

-- Backfill registry rows from existing invoices (derived counterparties)
INSERT INTO public.customers (company_id, name, org_number, source)
SELECT DISTINCT ON (i.company_id, lower(i.counterparty_name))
       i.company_id, i.counterparty_name, i.counterparty_org_number, 'invoice_derived'
FROM public.invoices i
WHERE i.invoice_direction = 'outgoing'
  AND i.counterparty_name IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.company_id = i.company_id
      AND lower(c.name) = lower(i.counterparty_name)
  )
ON CONFLICT DO NOTHING;

INSERT INTO public.suppliers (company_id, name, org_number, source)
SELECT DISTINCT ON (i.company_id, lower(i.counterparty_name))
       i.company_id, i.counterparty_name, i.counterparty_org_number, 'invoice_derived'
FROM public.invoices i
WHERE i.invoice_direction = 'incoming'
  AND i.counterparty_name IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.suppliers s
    WHERE s.company_id = i.company_id
      AND lower(s.name) = lower(i.counterparty_name)
  )
ON CONFLICT DO NOTHING;
