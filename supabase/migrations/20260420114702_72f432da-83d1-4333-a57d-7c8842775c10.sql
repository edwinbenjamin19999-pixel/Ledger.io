CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id uuid;
  v_org_number text;
  v_company_name text;
  v_existing_count int;
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;

  v_org_number := COALESCE(NULLIF(NEW.raw_user_meta_data->>'org_number', ''), 'TEMP-' || substring(NEW.id::text from 1 for 8));
  v_company_name := COALESCE(NULLIF(NEW.raw_user_meta_data->>'company_name', ''), 'Mitt Företag');

  SELECT count(*) INTO v_existing_count
  FROM public.companies
  WHERE org_number = v_org_number;

  IF v_existing_count > 0 THEN
    v_org_number := v_org_number || '-' || substring(NEW.id::text from 1 for 8);
  END IF;

  INSERT INTO public.companies (
    name,
    org_number,
    created_by,
    created_at,
    updated_at
  ) VALUES (
    v_company_name,
    v_org_number,
    NEW.id,
    now(),
    now()
  ) RETURNING id INTO v_company_id;

  PERFORM public.seed_bas_2026_accounts(v_company_id);

  RETURN NEW;
END;
$function$;