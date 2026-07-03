ALTER TABLE public.accounting_firms 
  ADD COLUMN IF NOT EXISTS brand_primary_color text DEFAULT '#0891b2',
  ADD COLUMN IF NOT EXISTS brand_accent_color text DEFAULT '#0e7490',
  ADD COLUMN IF NOT EXISTS support_email text,
  ADD COLUMN IF NOT EXISTS client_portal_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_client_self_signup boolean NOT NULL DEFAULT false;