CREATE OR REPLACE FUNCTION public.can_read_bureau_client_company(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.firm_clients fc
    WHERE fc.company_id = _company_id
      AND fc.is_active = true
      AND public.is_firm_member(_user_id, fc.firm_id)
  );
$$;

DROP POLICY IF EXISTS "Bureau members read client companies" ON public.companies;
CREATE POLICY "Bureau members read client companies"
ON public.companies
FOR SELECT
USING (public.can_read_bureau_client_company(auth.uid(), id));

DROP POLICY IF EXISTS "Bureau members read client journal entries" ON public.journal_entries;
CREATE POLICY "Bureau members read client journal entries"
ON public.journal_entries
FOR SELECT
USING (public.can_read_bureau_client_company(auth.uid(), company_id));

DROP POLICY IF EXISTS "Bureau members read client journal entry lines" ON public.journal_entry_lines;
CREATE POLICY "Bureau members read client journal entry lines"
ON public.journal_entry_lines
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.journal_entries je
    WHERE je.id = journal_entry_lines.journal_entry_id
      AND public.can_read_bureau_client_company(auth.uid(), je.company_id)
  )
);

DROP POLICY IF EXISTS "Bureau members read client chart accounts" ON public.chart_of_accounts;
CREATE POLICY "Bureau members read client chart accounts"
ON public.chart_of_accounts
FOR SELECT
USING (public.can_read_bureau_client_company(auth.uid(), company_id));

DROP POLICY IF EXISTS "Bureau members read client invoices" ON public.invoices;
CREATE POLICY "Bureau members read client invoices"
ON public.invoices
FOR SELECT
USING (public.can_read_bureau_client_company(auth.uid(), company_id));

DROP POLICY IF EXISTS "Bureau members read client bank transactions" ON public.bank_transactions;
CREATE POLICY "Bureau members read client bank transactions"
ON public.bank_transactions
FOR SELECT
USING (public.can_read_bureau_client_company(auth.uid(), company_id));

DROP POLICY IF EXISTS "Bureau members read client VAT declarations" ON public.vat_declarations;
CREATE POLICY "Bureau members read client VAT declarations"
ON public.vat_declarations
FOR SELECT
USING (public.can_read_bureau_client_company(auth.uid(), company_id));

DROP POLICY IF EXISTS "Bureau members read client employees" ON public.employees;
CREATE POLICY "Bureau members read client employees"
ON public.employees
FOR SELECT
USING (public.can_read_bureau_client_company(auth.uid(), company_id));

DROP POLICY IF EXISTS "Bureau members read client HR events" ON public.hr_events;
CREATE POLICY "Bureau members read client HR events"
ON public.hr_events
FOR SELECT
USING (public.can_read_bureau_client_company(auth.uid(), company_id));

DROP POLICY IF EXISTS "Bureau members read client AGI submissions" ON public.agi_submissions;
CREATE POLICY "Bureau members read client AGI submissions"
ON public.agi_submissions
FOR SELECT
USING (public.can_read_bureau_client_company(auth.uid(), company_id));
REVOKE ALL ON FUNCTION public.can_read_bureau_client_company(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_read_bureau_client_company(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_read_bureau_client_company(uuid, uuid) TO authenticated;
