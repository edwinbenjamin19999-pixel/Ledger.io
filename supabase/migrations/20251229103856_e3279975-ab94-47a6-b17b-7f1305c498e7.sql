-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can insert own agreements" ON public.user_agreements;
DROP POLICY IF EXISTS "Users can update own pending agreements" ON public.user_agreements;
DROP POLICY IF EXISTS "Users can view own agreements" ON public.user_agreements;

-- Create new permissive policies
CREATE POLICY "Users can view own agreements"
ON public.user_agreements
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own agreements"
ON public.user_agreements
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own agreements"
ON public.user_agreements
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Allow service role to update agreements (for BankID callback)
CREATE POLICY "Service role can manage all agreements"
ON public.user_agreements
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');