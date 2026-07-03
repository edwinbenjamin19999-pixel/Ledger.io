
ALTER TABLE public.accounting_firms
  ADD COLUMN IF NOT EXISTS subtitle text,
  ADD COLUMN IF NOT EXISTS show_powered_by boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS custom_domain text,
  ADD COLUMN IF NOT EXISTS custom_domain_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS portal_name text,
  ADD COLUMN IF NOT EXISTS portal_logo_url text,
  ADD COLUMN IF NOT EXISTS portal_welcome_message text;

DO $$ BEGIN
  ALTER TABLE public.accounting_firms
    ADD CONSTRAINT accounting_firms_custom_domain_status_check
    CHECK (custom_domain_status IN ('none','pending','verified','failed'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

INSERT INTO storage.buckets (id, name, public)
VALUES ('firm-branding', 'firm-branding', true)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  CREATE POLICY "Public can read firm branding"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'firm-branding');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Firm admins can upload branding"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'firm-branding'
      AND public.is_firm_admin(auth.uid(), ((storage.foldername(name))[1])::uuid)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Firm admins can update branding"
    ON storage.objects FOR UPDATE TO authenticated
    USING (
      bucket_id = 'firm-branding'
      AND public.is_firm_admin(auth.uid(), ((storage.foldername(name))[1])::uuid)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Firm admins can delete branding"
    ON storage.objects FOR DELETE TO authenticated
    USING (
      bucket_id = 'firm-branding'
      AND public.is_firm_admin(auth.uid(), ((storage.foldername(name))[1])::uuid)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
