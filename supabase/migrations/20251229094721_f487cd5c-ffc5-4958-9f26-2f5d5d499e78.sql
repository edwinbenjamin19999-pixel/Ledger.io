-- Fix: Clear plaintext columns after encryption to prevent data leakage
CREATE OR REPLACE FUNCTION public.encrypt_employee_pii_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Encrypt personal_number and clear plaintext
  IF NEW.personal_number IS NOT NULL AND NEW.personal_number != '' THEN
    NEW.personal_number_encrypted := public.encrypt_employee_pii(NEW.personal_number);
    -- Clear the plaintext column after encryption
    NEW.personal_number := '********';
  END IF;
  
  -- Encrypt bank_account and clear plaintext  
  IF NEW.bank_account IS NOT NULL AND NEW.bank_account != '' THEN
    NEW.bank_account_encrypted := public.encrypt_employee_pii(NEW.bank_account);
    -- Clear the plaintext column after encryption
    NEW.bank_account := '****';
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Ensure trigger exists on employees table
DROP TRIGGER IF EXISTS encrypt_employee_pii_on_change ON public.employees;
CREATE TRIGGER encrypt_employee_pii_on_change
  BEFORE INSERT OR UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_employee_pii_trigger();

-- Create secure function for accessing decrypted employee data with audit logging
CREATE OR REPLACE FUNCTION public.get_employee_pii(p_employee_id uuid)
RETURNS TABLE(
  personal_number text,
  bank_account text
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
  
  -- Get the company_id for the employee
  SELECT e.company_id INTO v_company_id
  FROM public.employees e
  WHERE e.id = p_employee_id;
  
  -- Verify user has access (owner or accountant role)
  IF NOT (
    public.has_company_access(v_user_id, v_company_id) AND 
    (public.has_role(v_user_id, 'owner'::app_role, v_company_id) OR 
     public.has_role(v_user_id, 'accountant'::app_role, v_company_id))
  ) THEN
    RAISE EXCEPTION 'Access denied: Insufficient permissions to view sensitive employee data';
  END IF;
  
  -- Log the access to sensitive data
  INSERT INTO public.audit_events (
    user_id,
    entity_type,
    entity_id,
    event_type,
    data_subject_id,
    data_categories,
    processing_purpose,
    legal_basis,
    company_id
  ) VALUES (
    v_user_id,
    'employee',
    p_employee_id,
    'PII_ACCESS',
    p_employee_id,
    ARRAY['personal_identity', 'financial'],
    'View sensitive employee information',
    'contract',
    v_company_id
  );
  
  -- Return decrypted data
  RETURN QUERY
  SELECT 
    public.decrypt_employee_pii(e.personal_number_encrypted) as personal_number,
    public.decrypt_employee_pii(e.bank_account_encrypted) as bank_account
  FROM public.employees e
  WHERE e.id = p_employee_id;
END;
$function$;

-- Clear any existing plaintext data in employees table (migrate to encrypted only)
UPDATE public.employees
SET 
  personal_number_encrypted = CASE 
    WHEN personal_number_encrypted IS NULL AND personal_number IS NOT NULL AND personal_number != '********'
    THEN public.encrypt_employee_pii(personal_number)
    ELSE personal_number_encrypted
  END,
  bank_account_encrypted = CASE 
    WHEN bank_account_encrypted IS NULL AND bank_account IS NOT NULL AND bank_account != '****'
    THEN public.encrypt_employee_pii(bank_account)
    ELSE bank_account_encrypted
  END,
  personal_number = '********',
  bank_account = '****'
WHERE personal_number != '********' OR bank_account != '****';