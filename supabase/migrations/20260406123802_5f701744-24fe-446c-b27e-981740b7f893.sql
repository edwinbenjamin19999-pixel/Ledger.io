-- ============================================================
-- Fix 1: Add NOT NULL constraint to user_roles.company_id
-- ============================================================
ALTER TABLE user_roles ALTER COLUMN company_id SET NOT NULL;

-- ============================================================
-- Fix 2: Scope storage INSERT policies by company path prefix
-- ============================================================

-- Documents bucket: scope INSERT to user's company path
DROP POLICY IF EXISTS "Company members can upload documents" ON storage.objects;
CREATE POLICY "Company members can upload documents" ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND (storage.foldername(name))[1] = ur.company_id::text
  )
);

-- Expense-receipts bucket: scope INSERT to user's company path
DROP POLICY IF EXISTS "Users can upload to their company expense receipts" ON storage.objects;
CREATE POLICY "Users can upload to their company expense receipts" ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'expense-receipts'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND (storage.foldername(name))[1] = ur.company_id::text
  )
);

-- ============================================================
-- Fix 3: Add DELETE and UPDATE policies for expense-receipts
-- ============================================================
CREATE POLICY "Company members can delete expense receipts" ON storage.objects FOR DELETE
USING (
  bucket_id = 'expense-receipts'
  AND EXISTS (
    SELECT 1 FROM expense_claim_files ecf
    JOIN expense_claims ec ON ec.id = ecf.expense_claim_id
    JOIN user_roles ur ON ur.company_id = ec.company_id
    WHERE ecf.file_url LIKE '%' || name
      AND ur.user_id = auth.uid()
  )
);

CREATE POLICY "Company members can update expense receipts" ON storage.objects FOR UPDATE
USING (
  bucket_id = 'expense-receipts'
  AND EXISTS (
    SELECT 1 FROM expense_claim_files ecf
    JOIN expense_claims ec ON ec.id = ecf.expense_claim_id
    JOIN user_roles ur ON ur.company_id = ec.company_id
    WHERE ecf.file_url LIKE '%' || name
      AND ur.user_id = auth.uid()
  )
)
WITH CHECK (bucket_id = 'expense-receipts');

-- ============================================================
-- Fix 4: Add policies for certificates bucket (service role only)
-- ============================================================
-- Certificates are managed by the system (mTLS), not by end users
-- Service role bypasses RLS, so these are restrictive deny-all for authenticated users

-- Also scope UPDATE on documents bucket properly
DROP POLICY IF EXISTS "Company members can update documents" ON storage.objects;
CREATE POLICY "Company members can update documents" ON storage.objects FOR UPDATE
USING (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1 FROM documents d
    JOIN user_roles ur ON ur.company_id = d.company_id
    WHERE d.file_url LIKE '%' || name
      AND ur.user_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND (storage.foldername(name))[1] = ur.company_id::text
  )
);