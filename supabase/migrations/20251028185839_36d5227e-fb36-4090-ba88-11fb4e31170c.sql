-- Add logo_url to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url text;

COMMENT ON COLUMN companies.logo_url IS 'URL to company logo for invoices and documents';