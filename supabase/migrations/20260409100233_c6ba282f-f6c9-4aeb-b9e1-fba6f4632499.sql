
-- Fix 1: Restrict governance_audit_log SELECT to owners and auditors only
DROP POLICY IF EXISTS "Users can view own company audit logs" ON public.governance_audit_log;

CREATE POLICY "Owners and auditors can view company audit logs"
  ON public.governance_audit_log FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('owner', 'auditor')
    )
  );

-- Fix 2: Add storage policies for certificates bucket
CREATE POLICY "Company owners can read certificates"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'certificates'
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'owner'
        AND ur.company_id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "Company owners can upload certificates"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'certificates'
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'owner'
        AND ur.company_id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "Company owners can update certificates"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'certificates'
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'owner'
        AND ur.company_id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "Company owners can delete certificates"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'certificates'
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'owner'
        AND ur.company_id::text = (storage.foldername(name))[1]
    )
  );
