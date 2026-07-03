GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

CREATE OR REPLACE FUNCTION public.set_company_created_by()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to create a company';
  END IF;

  NEW.created_by := auth.uid();
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
WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Creators can view companies they created" ON public.companies;
CREATE POLICY "Creators can view companies they created"
ON public.companies
FOR SELECT
TO authenticated
USING (auth.uid() = created_by);