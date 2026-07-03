ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_company_id_personal_number_key;

CREATE UNIQUE INDEX IF NOT EXISTS employees_company_id_personal_number_encrypted_key
  ON public.employees (company_id, personal_number_encrypted)
  WHERE personal_number_encrypted IS NOT NULL;