
CREATE OR REPLACE FUNCTION public.create_default_company_for_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id UUID;
  v_unique_org TEXT;
BEGIN
  -- Generate a unique placeholder org_number to avoid unique constraint violation
  v_unique_org := 'TEMP-' || substring(NEW.id::text from 1 for 8);

  INSERT INTO public.companies (
    name,
    org_number,
    created_by,
    created_at,
    updated_at
  ) VALUES (
    'Mitt Företag',
    v_unique_org,
    NEW.id,
    now(),
    now()
  ) RETURNING id INTO v_company_id;

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
$function$;
