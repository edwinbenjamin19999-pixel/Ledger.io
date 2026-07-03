-- Create a function to create a default company for new users
CREATE OR REPLACE FUNCTION public.create_default_company_for_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
BEGIN
  -- Create a default company for the new user
  INSERT INTO public.companies (
    name,
    org_number,
    created_by,
    created_at,
    updated_at
  ) VALUES (
    'Mitt Företag',
    '',
    NEW.id,
    now(),
    now()
  ) RETURNING id INTO v_company_id;
  
  -- Assign owner role to the user
  INSERT INTO public.user_roles (
    user_id,
    role,
    company_id,
    created_at
  ) VALUES (
    NEW.id,
    'owner'::app_role,
    v_company_id,
    now()
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically create company for new users
DROP TRIGGER IF EXISTS on_profile_created_create_company ON public.profiles;
CREATE TRIGGER on_profile_created_create_company
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_company_for_new_user();