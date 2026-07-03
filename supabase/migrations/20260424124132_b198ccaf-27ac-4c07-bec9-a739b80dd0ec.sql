CREATE OR REPLACE FUNCTION public.seed_default_payment_provider()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.payment_providers (company_id, provider_type, provider_name, display_name, supports_account_information, supports_payment_initiation, status)
  VALUES (NEW.id, 'file_export', 'manual_file_export', 'Manuell filexport (ISO 20022)', false, false, 'active')
  ON CONFLICT (company_id, provider_name) DO NOTHING;
  RETURN NEW;
END;
$$;