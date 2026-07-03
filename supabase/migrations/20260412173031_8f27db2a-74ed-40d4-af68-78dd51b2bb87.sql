-- Drop existing update policy
DROP POLICY IF EXISTS "Users can update own or assigned claims" ON public.expense_claims;

-- Recreate with broader company membership check for attestation
CREATE POLICY "Users can update expense claims in their companies"
  ON public.expense_claims FOR UPDATE TO authenticated
  USING (
    company_id IN (SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid())
  );