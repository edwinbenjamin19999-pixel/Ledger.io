-- Create system_secrets table for storing sensitive configuration
CREATE TABLE IF NOT EXISTS public.system_secrets (
  key TEXT PRIMARY KEY,
  value_encrypted TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on system_secrets
ALTER TABLE public.system_secrets ENABLE ROW LEVEL SECURITY;

-- Only service role can access system_secrets (no user access)
-- This table should only be accessed via SECURITY DEFINER functions

-- Insert the Skatteverket test credentials into system_secrets
-- These can now be managed/rotated without code changes
INSERT INTO public.system_secrets (key, value_encrypted, description)
VALUES 
  ('skatteverket_test_client_id', '4b43c546646c3b8b9371d97690e43a4beb2189e169770069', 'Skatteverket test environment client ID'),
  ('skatteverket_test_client_secret', 'd70f147fea15edc68cb6b6a08f023337d1171eec26bc3a4beb2189e169770069', 'Skatteverket test environment client secret (encrypted)')
ON CONFLICT (key) DO UPDATE SET 
  value_encrypted = EXCLUDED.value_encrypted,
  updated_at = now();

-- Update the trigger function to read from system_secrets instead of hardcoded values
CREATE OR REPLACE FUNCTION public.assign_skatteverket_credentials_to_new_company()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_client_id TEXT;
  v_client_secret TEXT;
BEGIN
  -- Read credentials from system_secrets table instead of hardcoded values
  SELECT value_encrypted INTO v_client_id
  FROM public.system_secrets
  WHERE key = 'skatteverket_test_client_id';
  
  SELECT value_encrypted INTO v_client_secret
  FROM public.system_secrets
  WHERE key = 'skatteverket_test_client_secret';
  
  -- Only insert if credentials are found
  IF v_client_id IS NOT NULL AND v_client_secret IS NOT NULL THEN
    INSERT INTO public.skatteverket_credentials (
      company_id,
      client_id,
      client_secret_encrypted,
      environment,
      is_active,
      created_by
    )
    VALUES (
      NEW.id,
      v_client_id,
      v_client_secret,
      'test',
      true,
      NEW.created_by
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Add update trigger for system_secrets
CREATE TRIGGER update_system_secrets_updated_at
  BEFORE UPDATE ON public.system_secrets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();