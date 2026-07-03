
-- Fix expense-receipts UPDATE policy WITH CHECK to include company membership
DROP POLICY IF EXISTS "Company members can update expense receipts" ON storage.objects;
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
WITH CHECK (
  bucket_id = 'expense-receipts'
  AND EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
      AND (storage.foldername(name))[1] = ur.company_id::text
  )
);
