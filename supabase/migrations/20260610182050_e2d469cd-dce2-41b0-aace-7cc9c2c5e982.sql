-- Make creating a company robust: auto-set created_by from auth.uid() and
-- relax the INSERT policy so any authenticated user can create a company.

CREATE OR REPLACE FUNCTION public.set_company_created_by()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_company_created_by_trg ON public.companies;
CREATE TRIGGER set_company_created_by_trg
BEFORE INSERT ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.set_company_created_by();

DROP POLICY IF EXISTS "Authenticated users can insert companies" ON public.companies;
CREATE POLICY "Authenticated users can insert companies"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);
