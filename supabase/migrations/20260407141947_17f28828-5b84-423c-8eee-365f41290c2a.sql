
-- Create a public bucket for company logos
INSERT INTO storage.buckets (id, name, public) VALUES ('company-logos', 'company-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone can view logos (public bucket)
CREATE POLICY "Logos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-logos');

-- Company members can upload logos
CREATE POLICY "Company members can upload logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'company-logos'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND (storage.foldername(name))[1] = ur.company_id::text
  )
);

-- Company members can update logos
CREATE POLICY "Company members can update logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'company-logos'
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND (storage.foldername(name))[1] = ur.company_id::text
  )
)
WITH CHECK (
  bucket_id = 'company-logos'
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND (storage.foldername(name))[1] = ur.company_id::text
  )
);

-- Company members can delete logos
CREATE POLICY "Company members can delete logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'company-logos'
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND (storage.foldername(name))[1] = ur.company_id::text
  )
);
