-- Create function to mask IBAN (show only last 4 characters)
CREATE OR REPLACE FUNCTION public.mask_iban(iban text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF iban IS NULL OR length(iban) < 4 THEN
    RETURN '****';
  END IF;
  RETURN repeat('*', length(iban) - 4) || right(iban, 4);
END;
$function$;

-- Create secure function to get full bank account details with audit logging
CREATE OR REPLACE FUNCTION public.get_bank_account_full_details(p_bank_account_id uuid)
RETURNS TABLE(
  id uuid,
  bank_name text,
  account_name text,
  iban text,
  account_number text,
  balance numeric,
  currency text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id uuid;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  -- Get the company_id for the bank account
  SELECT ba.company_id INTO v_company_id
  FROM public.bank_accounts ba
  WHERE ba.id = p_bank_account_id;
  
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Bank account not found';
  END IF;
  
  -- Verify user has access (owner role only for full details)
  IF NOT (
    public.has_company_access(v_user_id, v_company_id) AND 
    public.has_role(v_user_id, 'owner'::app_role, v_company_id)
  ) THEN
    RAISE EXCEPTION 'Access denied: Only owners can view full bank account details';
  END IF;
  
  -- Log the access to sensitive financial data
  INSERT INTO public.audit_events (
    user_id,
    entity_type,
    entity_id,
    event_type,
    data_categories,
    processing_purpose,
    legal_basis,
    company_id
  ) VALUES (
    v_user_id,
    'bank_account',
    p_bank_account_id,
    'FINANCIAL_DATA_ACCESS',
    ARRAY['financial', 'bank_credentials'],
    'View full bank account details including IBAN',
    'contract',
    v_company_id
  );
  
  -- Return full details
  RETURN QUERY
  SELECT 
    ba.id,
    ba.bank_name,
    ba.account_name,
    ba.iban,
    ba.account_number,
    ba.balance,
    ba.currency
  FROM public.bank_accounts ba
  WHERE ba.id = p_bank_account_id;
END;
$function$;

-- Create a view that shows masked IBANs for normal access
CREATE OR REPLACE VIEW public.bank_accounts_masked AS
SELECT 
  id,
  company_id,
  bank_name,
  account_name,
  public.mask_iban(iban) as iban_masked,
  CASE 
    WHEN account_number IS NOT NULL THEN '****' || right(account_number, 4)
    ELSE NULL
  END as account_number_masked,
  balance,
  currency,
  last_synced_at,
  is_active,
  created_at,
  updated_at
FROM public.bank_accounts;

-- Add RLS to the view (views inherit from base table RLS)
-- Grant access to authenticated users
GRANT SELECT ON public.bank_accounts_masked TO authenticated;

-- Log function for tracking bank account list access
CREATE OR REPLACE FUNCTION public.log_bank_accounts_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only log if user is authenticated
  IF auth.uid() IS NOT NULL THEN
    INSERT INTO public.audit_events (
      user_id,
      entity_type,
      entity_id,
      event_type,
      data_categories,
      processing_purpose,
      legal_basis,
      company_id
    ) VALUES (
      auth.uid(),
      'bank_account',
      NEW.id,
      'VIEW',
      ARRAY['financial'],
      'View bank account information',
      'contract',
      NEW.company_id
    );
  END IF;
  RETURN NEW;
END;
$function$;