-- Step 1: Add encrypted columns for sensitive data
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS personal_number_encrypted TEXT,
ADD COLUMN IF NOT EXISTS bank_account_encrypted TEXT;