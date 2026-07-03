
-- 1) ai_economist_actions: replace permissive policies with company-scoped
DROP POLICY IF EXISTS "authenticated can view ai economist actions" ON public.ai_economist_actions;
DROP POLICY IF EXISTS "authenticated can insert ai economist actions" ON public.ai_economist_actions;
DROP POLICY IF EXISTS "authenticated can update ai economist actions" ON public.ai_economist_actions;

CREATE POLICY "Company members view ai economist actions"
ON public.ai_economist_actions FOR SELECT TO authenticated
USING (public.has_company_access(auth.uid(), company_id));

CREATE POLICY "Company members insert ai economist actions"
ON public.ai_economist_actions FOR INSERT TO authenticated
WITH CHECK (public.has_company_access(auth.uid(), company_id));

CREATE POLICY "Company members update ai economist actions"
ON public.ai_economist_actions FOR UPDATE TO authenticated
USING (public.has_company_access(auth.uid(), company_id))
WITH CHECK (public.has_company_access(auth.uid(), company_id));

-- 2) fortnox_connections: scope admin to company_id
DROP POLICY IF EXISTS "Admins can view fortnox connections" ON public.fortnox_connections;
DROP POLICY IF EXISTS "Admins can insert fortnox connections" ON public.fortnox_connections;
DROP POLICY IF EXISTS "Admins can update fortnox connections" ON public.fortnox_connections;
DROP POLICY IF EXISTS "Admins can delete fortnox connections" ON public.fortnox_connections;

CREATE POLICY "Company admins view fortnox connections"
ON public.fortnox_connections FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role, company_id));

CREATE POLICY "Company admins insert fortnox connections"
ON public.fortnox_connections FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role, company_id));

CREATE POLICY "Company admins update fortnox connections"
ON public.fortnox_connections FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role, company_id))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role, company_id));

CREATE POLICY "Company admins delete fortnox connections"
ON public.fortnox_connections FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role, company_id));

-- 3) visma_connections: scope admin to company_id (drop unscoped OR branch)
DROP POLICY IF EXISTS "Company admins can view visma_connections" ON public.visma_connections;
DROP POLICY IF EXISTS "Company admins can insert visma_connections" ON public.visma_connections;
DROP POLICY IF EXISTS "Company admins can update visma_connections" ON public.visma_connections;
DROP POLICY IF EXISTS "Company admins can delete visma_connections" ON public.visma_connections;

CREATE POLICY "Company members view visma_connections"
ON public.visma_connections FOR SELECT TO authenticated
USING (public.has_company_access(auth.uid(), company_id));

CREATE POLICY "Company members insert visma_connections"
ON public.visma_connections FOR INSERT TO authenticated
WITH CHECK (public.has_company_access(auth.uid(), company_id));

CREATE POLICY "Company members update visma_connections"
ON public.visma_connections FOR UPDATE TO authenticated
USING (public.has_company_access(auth.uid(), company_id))
WITH CHECK (public.has_company_access(auth.uid(), company_id));

CREATE POLICY "Company members delete visma_connections"
ON public.visma_connections FOR DELETE TO authenticated
USING (public.has_company_access(auth.uid(), company_id));

-- 4) vat_box_overrides: scope to row company_id
DROP POLICY IF EXISTS "Company members can manage VAT overrides" ON public.vat_box_overrides;
CREATE POLICY "Company members manage VAT overrides"
ON public.vat_box_overrides FOR ALL TO authenticated
USING (
  public.has_company_access(auth.uid(), company_id)
  AND (
    public.has_role(auth.uid(), 'admin'::app_role, company_id)
    OR public.has_role(auth.uid(), 'accountant'::app_role, company_id)
    OR public.has_role(auth.uid(), 'cfo'::app_role, company_id)
    OR public.has_role(auth.uid(), 'owner'::app_role, company_id)
  )
)
WITH CHECK (
  public.has_company_access(auth.uid(), company_id)
  AND (
    public.has_role(auth.uid(), 'admin'::app_role, company_id)
    OR public.has_role(auth.uid(), 'accountant'::app_role, company_id)
    OR public.has_role(auth.uid(), 'cfo'::app_role, company_id)
    OR public.has_role(auth.uid(), 'owner'::app_role, company_id)
  )
);

-- 5) vat_ai_reviews: scope to row company_id
DROP POLICY IF EXISTS "Company members can view VAT reviews" ON public.vat_ai_reviews;
DROP POLICY IF EXISTS "Company members can insert VAT reviews" ON public.vat_ai_reviews;

CREATE POLICY "Company members view VAT reviews"
ON public.vat_ai_reviews FOR SELECT TO authenticated
USING (
  public.has_company_access(auth.uid(), company_id)
  AND (
    public.has_role(auth.uid(), 'admin'::app_role, company_id)
    OR public.has_role(auth.uid(), 'accountant'::app_role, company_id)
    OR public.has_role(auth.uid(), 'cfo'::app_role, company_id)
    OR public.has_role(auth.uid(), 'auditor'::app_role, company_id)
    OR public.has_role(auth.uid(), 'owner'::app_role, company_id)
  )
);

CREATE POLICY "Company members insert VAT reviews"
ON public.vat_ai_reviews FOR INSERT TO authenticated
WITH CHECK (
  public.has_company_access(auth.uid(), company_id)
  AND (
    public.has_role(auth.uid(), 'admin'::app_role, company_id)
    OR public.has_role(auth.uid(), 'accountant'::app_role, company_id)
    OR public.has_role(auth.uid(), 'cfo'::app_role, company_id)
    OR public.has_role(auth.uid(), 'owner'::app_role, company_id)
  )
);

-- 6) imported tables + opening_balances + migration_jobs + account_mapping: scope admin to row company_id
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'imported_customer_invoices',
    'imported_supplier_invoices',
    'imported_customers',
    'imported_suppliers',
    'opening_balances',
    'migration_jobs',
    'account_mapping'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Company members can view %1$s" ON public.%1$I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Company members can insert %1$s" ON public.%1$I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Company members can update %1$s" ON public.%1$I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Company members can delete %1$s" ON public.%1$I', t);

    EXECUTE format($f$
      CREATE POLICY "Company members view %1$s"
      ON public.%1$I FOR SELECT TO authenticated
      USING (
        public.has_role(auth.uid(), 'admin'::app_role, company_id)
        OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid() AND ur.company_id = %1$I.company_id
        )
      )
    $f$, t);

    EXECUTE format($f$
      CREATE POLICY "Company members insert %1$s"
      ON public.%1$I FOR INSERT TO authenticated
      WITH CHECK (
        public.has_role(auth.uid(), 'admin'::app_role, company_id)
        OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid() AND ur.company_id = %1$I.company_id
        )
      )
    $f$, t);

    EXECUTE format($f$
      CREATE POLICY "Company members update %1$s"
      ON public.%1$I FOR UPDATE TO authenticated
      USING (
        public.has_role(auth.uid(), 'admin'::app_role, company_id)
        OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid() AND ur.company_id = %1$I.company_id
        )
      )
    $f$, t);

    EXECUTE format($f$
      CREATE POLICY "Company members delete %1$s"
      ON public.%1$I FOR DELETE TO authenticated
      USING (
        public.has_role(auth.uid(), 'admin'::app_role, company_id)
        OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid() AND ur.company_id = %1$I.company_id
        )
      )
    $f$, t);
  END LOOP;
END $$;

-- 7) Storage: remove overly broad documents bucket policies
DROP POLICY IF EXISTS "Authenticated users can view documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete own documents" ON storage.objects;
