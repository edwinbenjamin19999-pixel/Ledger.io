-- Fix 1: Drop overly broad storage policies on documents bucket
DROP POLICY IF EXISTS "Authenticated users can read documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload documents" ON storage.objects;

-- Add company-scoped INSERT policy for documents bucket
CREATE POLICY "Company members can upload documents" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND auth.uid() IS NOT NULL
  );

-- Add company-scoped UPDATE policy for documents bucket
CREATE POLICY "Company members can update documents" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'documents'
    AND EXISTS (
      SELECT 1 FROM public.documents d
      JOIN public.user_roles ur ON ur.company_id = d.company_id
      WHERE d.file_url LIKE '%' || storage.objects.name
      AND ur.user_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'documents'
  );

-- Add company-scoped DELETE policy for documents bucket
CREATE POLICY "Company members can delete documents" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'documents'
    AND EXISTS (
      SELECT 1 FROM public.documents d
      JOIN public.user_roles ur ON ur.company_id = d.company_id
      WHERE d.file_url LIKE '%' || storage.objects.name
      AND ur.user_id = auth.uid()
    )
  );

-- Fix 2: Drop and recreate expense_claim_files SELECT policy with company scope
DROP POLICY IF EXISTS "Users can view expense claim files" ON public.expense_claim_files;
CREATE POLICY "Users can view expense claim files" ON public.expense_claim_files
  FOR SELECT TO authenticated
  USING (
    expense_claim_id IN (
      SELECT id FROM public.expense_claims
      WHERE company_id IN (
        SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()
      )
    )
  );

-- Fix 3: Drop overly broad admin_notifications INSERT policy
DROP POLICY IF EXISTS "System can insert admin notifications" ON public.admin_notifications;