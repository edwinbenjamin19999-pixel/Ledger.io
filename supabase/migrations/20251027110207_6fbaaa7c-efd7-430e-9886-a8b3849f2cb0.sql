-- Fix RLS policy for companies table to allow authenticated users to create companies
DROP POLICY IF EXISTS "Owners can insert companies" ON public.companies;

-- Allow authenticated users to insert companies
CREATE POLICY "Authenticated users can insert companies"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Create trigger function to automatically assign owner role when company is created
CREATE OR REPLACE FUNCTION public.assign_owner_role_on_company_create()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Assign owner role to the user who created the company
  INSERT INTO public.user_roles (user_id, role, company_id)
  VALUES (NEW.created_by, 'owner'::app_role, NEW.id);
  
  RETURN NEW;
END;
$$;

-- Create trigger on companies table
DROP TRIGGER IF EXISTS on_company_created ON public.companies;
CREATE TRIGGER on_company_created
AFTER INSERT ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.assign_owner_role_on_company_create();