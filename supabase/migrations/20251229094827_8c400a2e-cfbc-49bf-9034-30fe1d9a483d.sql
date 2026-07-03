-- Drop the security definer view as it's a security risk
DROP VIEW IF EXISTS public.bank_accounts_masked;

-- Drop the unused trigger function
DROP FUNCTION IF EXISTS public.log_bank_accounts_access();

-- Instead, update the mask_iban function to be SECURITY INVOKER (safer)
CREATE OR REPLACE FUNCTION public.mask_iban(iban text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $function$
  SELECT CASE 
    WHEN iban IS NULL OR length(iban) < 4 THEN '****'
    ELSE repeat('*', length(iban) - 4) || right(iban, 4)
  END;
$function$;