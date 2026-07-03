-- Complete Employee PII Encryption Setup

-- 1. Insert the encryption key
INSERT INTO public.system_secrets (key, value_encrypted, description)
VALUES ('employee_pii_encryption_key', encode(extensions.gen_random_bytes(32), 'hex'), 'Encryption key for employee PII fields')
ON CONFLICT (key) DO NOTHING;

-- 2. Create encryption function
CREATE OR REPLACE FUNCTION public.encrypt_employee_pii(plaintext TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  IF plaintext IS NULL OR plaintext = '' THEN
    RETURN NULL;
  END IF;
  
  SELECT value_encrypted INTO encryption_key
  FROM public.system_secrets
  WHERE key = 'employee_pii_encryption_key';
  
  IF encryption_key IS NULL THEN
    RETURN NULL; -- Graceful fallback
  END IF;
  
  RETURN encode(
    extensions.pgp_sym_encrypt(
      plaintext,
      encryption_key,
      'compress-algo=1, cipher-algo=aes256'
    ),
    'base64'
  );
END;
$$;

-- 3. Create decryption function
CREATE OR REPLACE FUNCTION public.decrypt_employee_pii(ciphertext TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  IF ciphertext IS NULL OR ciphertext = '' THEN
    RETURN NULL;
  END IF;
  
  SELECT value_encrypted INTO encryption_key
  FROM public.system_secrets
  WHERE key = 'employee_pii_encryption_key';
  
  IF encryption_key IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN extensions.pgp_sym_decrypt(
    decode(ciphertext, 'base64'),
    encryption_key
  );
END;
$$;

-- 4. Create masking functions
CREATE OR REPLACE FUNCTION public.mask_personal_number(personal_number TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF personal_number IS NULL OR length(personal_number) < 4 THEN
    RETURN '****';
  END IF;
  RETURN regexp_replace(personal_number, '^.{' || (length(personal_number) - 4) || '}', repeat('*', length(personal_number) - 4));
END;
$$;

CREATE OR REPLACE FUNCTION public.mask_bank_account(bank_account TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF bank_account IS NULL OR length(bank_account) < 4 THEN
    RETURN '****';
  END IF;
  RETURN regexp_replace(bank_account, '^.{' || (length(bank_account) - 4) || '}', repeat('*', length(bank_account) - 4));
END;
$$;

-- 5. Create automatic encryption trigger
CREATE OR REPLACE FUNCTION public.encrypt_employee_pii_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.personal_number IS DISTINCT FROM OLD.personal_number OR 
     (TG_OP = 'INSERT' AND NEW.personal_number IS NOT NULL) THEN
    NEW.personal_number_encrypted := public.encrypt_employee_pii(NEW.personal_number);
  END IF;
  
  IF NEW.bank_account IS DISTINCT FROM OLD.bank_account OR 
     (TG_OP = 'INSERT' AND NEW.bank_account IS NOT NULL) THEN
    NEW.bank_account_encrypted := public.encrypt_employee_pii(NEW.bank_account);
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS encrypt_employee_pii_on_change ON public.employees;

CREATE TRIGGER encrypt_employee_pii_on_change
  BEFORE INSERT OR UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_employee_pii_trigger();