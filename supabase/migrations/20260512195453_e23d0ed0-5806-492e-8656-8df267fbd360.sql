ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS counterparty_type text NOT NULL DEFAULT 'customer';

ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS counterparty_type text NOT NULL DEFAULT 'supplier';

ALTER TABLE public.customers
  DROP CONSTRAINT IF EXISTS customers_counterparty_type_check;
ALTER TABLE public.customers
  ADD CONSTRAINT customers_counterparty_type_check
  CHECK (counterparty_type IN ('customer', 'supplier', 'both'));

ALTER TABLE public.suppliers
  DROP CONSTRAINT IF EXISTS suppliers_counterparty_type_check;
ALTER TABLE public.suppliers
  ADD CONSTRAINT suppliers_counterparty_type_check
  CHECK (counterparty_type IN ('customer', 'supplier', 'both'));

CREATE OR REPLACE FUNCTION public.normalized_org_number(_org text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT NULLIF(regexp_replace(coalesce(_org, ''), '\\D', '', 'g'), '')
$$;

CREATE OR REPLACE FUNCTION public.sync_counterparty_type_between_registries()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_org text;
  other_exists boolean;
BEGIN
  normalized_org := public.normalized_org_number(NEW.org_number);

  IF TG_TABLE_NAME = 'customers' THEN
    IF normalized_org IS NULL THEN
      NEW.counterparty_type := 'customer';
      RETURN NEW;
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM public.suppliers s
      WHERE s.company_id = NEW.company_id
        AND public.normalized_org_number(s.org_number) = normalized_org
    ) INTO other_exists;

    NEW.counterparty_type := CASE WHEN other_exists THEN 'both' ELSE 'customer' END;

    IF other_exists AND pg_trigger_depth() < 2 THEN
      UPDATE public.suppliers
      SET counterparty_type = 'both'
      WHERE company_id = NEW.company_id
        AND public.normalized_org_number(org_number) = normalized_org
        AND counterparty_type <> 'both';
    END IF;

    RETURN NEW;
  END IF;

  IF normalized_org IS NULL THEN
    NEW.counterparty_type := 'supplier';
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.company_id = NEW.company_id
      AND public.normalized_org_number(c.org_number) = normalized_org
  ) INTO other_exists;

  NEW.counterparty_type := CASE WHEN other_exists THEN 'both' ELSE 'supplier' END;

  IF other_exists AND pg_trigger_depth() < 2 THEN
    UPDATE public.customers
    SET counterparty_type = 'both'
    WHERE company_id = NEW.company_id
      AND public.normalized_org_number(org_number) = normalized_org
      AND counterparty_type <> 'both';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS customers_sync_counterparty_type ON public.customers;
CREATE TRIGGER customers_sync_counterparty_type
BEFORE INSERT OR UPDATE OF company_id, org_number ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.sync_counterparty_type_between_registries();

DROP TRIGGER IF EXISTS suppliers_sync_counterparty_type ON public.suppliers;
CREATE TRIGGER suppliers_sync_counterparty_type
BEFORE INSERT OR UPDATE OF company_id, org_number ON public.suppliers
FOR EACH ROW
EXECUTE FUNCTION public.sync_counterparty_type_between_registries();

UPDATE public.customers c
SET counterparty_type = CASE WHEN EXISTS (
  SELECT 1 FROM public.suppliers s
  WHERE s.company_id = c.company_id
    AND public.normalized_org_number(s.org_number) = public.normalized_org_number(c.org_number)
    AND public.normalized_org_number(c.org_number) IS NOT NULL
) THEN 'both' ELSE 'customer' END;

UPDATE public.suppliers s
SET counterparty_type = CASE WHEN EXISTS (
  SELECT 1 FROM public.customers c
  WHERE c.company_id = s.company_id
    AND public.normalized_org_number(c.org_number) = public.normalized_org_number(s.org_number)
    AND public.normalized_org_number(s.org_number) IS NOT NULL
) THEN 'both' ELSE 'supplier' END;