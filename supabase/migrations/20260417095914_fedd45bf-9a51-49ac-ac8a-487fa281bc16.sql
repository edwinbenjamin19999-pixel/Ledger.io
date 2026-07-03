
-- Create tenant-assets storage bucket for white-label logos and favicons
INSERT INTO storage.buckets (id, name, public)
VALUES ('tenant-assets', 'tenant-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access (assets are referenced from login page / sidebar)
CREATE POLICY "Public can view tenant assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'tenant-assets');

-- Tenant admins can upload assets to their tenant folder (path: <tenant_id>/...)
CREATE POLICY "Tenant admins can upload tenant assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'tenant-assets'
  AND public.is_tenant_admin(auth.uid(), (storage.foldername(name))[1]::uuid)
);

-- Tenant admins can update their tenant's assets
CREATE POLICY "Tenant admins can update tenant assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'tenant-assets'
  AND public.is_tenant_admin(auth.uid(), (storage.foldername(name))[1]::uuid)
);

-- Tenant admins can delete their tenant's assets
CREATE POLICY "Tenant admins can delete tenant assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'tenant-assets'
  AND public.is_tenant_admin(auth.uid(), (storage.foldername(name))[1]::uuid)
);
