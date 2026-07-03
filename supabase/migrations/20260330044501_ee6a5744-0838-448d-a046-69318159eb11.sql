-- Fix invoices RLS: the ALL policy needs WITH CHECK for INSERT/UPDATE to work
DROP POLICY IF EXISTS "Users can manage invoices" ON public.invoices;

CREATE POLICY "Users can manage invoices"
ON public.invoices
FOR ALL
TO authenticated
USING (has_company_access(auth.uid(), company_id))
WITH CHECK (has_company_access(auth.uid(), company_id));