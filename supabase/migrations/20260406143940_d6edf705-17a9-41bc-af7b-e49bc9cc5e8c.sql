-- Fix expense_claims INSERT policy to require company membership
DROP POLICY IF EXISTS "Users can create expense claims" ON expense_claims;
CREATE POLICY "Users can create expense claims" ON expense_claims
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND company_id IN (SELECT ur.company_id FROM user_roles ur WHERE ur.user_id = auth.uid())
  );