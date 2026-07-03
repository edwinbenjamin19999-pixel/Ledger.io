
DROP POLICY "Users can insert camt054 transactions" ON public.camt054_transactions;

CREATE POLICY "Users can insert camt054 transactions"
  ON public.camt054_transactions FOR INSERT TO authenticated
  WITH CHECK (company_id IN (
    SELECT id FROM public.companies WHERE created_by = auth.uid()
  ) OR company_id IN (
    SELECT c.id FROM public.companies c
    JOIN public.user_roles ur ON ur.user_id = auth.uid()
    WHERE c.id = camt054_transactions.company_id
  ));
