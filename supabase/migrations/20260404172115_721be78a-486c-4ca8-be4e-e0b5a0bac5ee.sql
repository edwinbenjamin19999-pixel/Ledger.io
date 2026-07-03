
DROP POLICY "System can insert flags" ON public.flagged_transactions;
CREATE POLICY "Authenticated can insert flags for own companies"
  ON public.flagged_transactions FOR INSERT
  WITH CHECK (has_company_access(auth.uid(), company_id) OR current_setting('role', true) = 'postgres');
