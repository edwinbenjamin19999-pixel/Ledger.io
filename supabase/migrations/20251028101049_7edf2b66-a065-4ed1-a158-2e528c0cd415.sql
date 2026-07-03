-- Function to automatically assign Skatteverket credentials to new companies
CREATE OR REPLACE FUNCTION public.assign_skatteverket_credentials_to_new_company()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert Skatteverket credentials for the new company using the master credentials
  INSERT INTO public.skatteverket_credentials (
    company_id,
    client_id,
    client_secret_encrypted,
    environment,
    is_active,
    created_by
  )
  SELECT 
    NEW.id,
    '4b43c546646c3b8b9371d97690e43a4beb2189e169770069',
    'd70f147fea15edc68cb6b6a08f023337d1171eec26bc3a4beb2189e169770069',
    'test',
    true,
    NEW.created_by;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically assign Skatteverket credentials when a company is created
DROP TRIGGER IF EXISTS assign_skatteverket_credentials_on_company_create ON public.companies;
CREATE TRIGGER assign_skatteverket_credentials_on_company_create
AFTER INSERT ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.assign_skatteverket_credentials_to_new_company();