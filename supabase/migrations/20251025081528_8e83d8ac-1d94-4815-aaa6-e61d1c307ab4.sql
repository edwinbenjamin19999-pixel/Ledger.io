-- Add email_inbox_address column to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS email_inbox_address TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_companies_email_inbox 
ON public.companies(email_inbox_address);

-- Add comment explaining the column
COMMENT ON COLUMN public.companies.email_inbox_address IS 'Unique email address where users can send documents for automatic processing';
