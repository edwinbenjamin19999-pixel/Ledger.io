ALTER TABLE public.customer_invoice_settings 
ADD COLUMN IF NOT EXISTS logo_size_pct integer NOT NULL DEFAULT 100 
CHECK (logo_size_pct BETWEEN 40 AND 200);