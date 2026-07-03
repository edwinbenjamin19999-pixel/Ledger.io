
-- 1. service_agreements: service_role only
DROP POLICY IF EXISTS "Only system can manage agreements" ON service_agreements;
CREATE POLICY "Only service role can manage agreements"
  ON service_agreements FOR ALL
  USING (
    ((current_setting('request.jwt.claims'::text, true))::json ->> 'role') = 'service_role'
    OR current_setting('role', true) = 'postgres'
  )
  WITH CHECK (
    ((current_setting('request.jwt.claims'::text, true))::json ->> 'role') = 'service_role'
    OR current_setting('role', true) = 'postgres'
  );

-- 2. companies: scope owner ops to own companies
DROP POLICY IF EXISTS "Owners can update companies" ON companies;
DROP POLICY IF EXISTS "Owners can delete companies" ON companies;
CREATE POLICY "Owners can update their own companies"
  ON companies FOR UPDATE
  USING (has_company_access(auth.uid(), id) AND has_role(auth.uid(), 'owner'::app_role, id))
  WITH CHECK (has_company_access(auth.uid(), id) AND has_role(auth.uid(), 'owner'::app_role, id));
CREATE POLICY "Owners can delete their own companies"
  ON companies FOR DELETE
  USING (has_company_access(auth.uid(), id) AND has_role(auth.uid(), 'owner'::app_role, id));

-- 3. groups: scope to owning companies in group
DROP POLICY IF EXISTS "Owners can manage groups" ON groups;
CREATE POLICY "Owners can manage their groups"
  ON groups FOR ALL
  USING (EXISTS (
    SELECT 1 FROM companies c JOIN user_roles ur ON ur.company_id = c.id
    WHERE c.group_id = groups.id AND ur.user_id = auth.uid() AND ur.role = 'owner'::app_role
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM companies c JOIN user_roles ur ON ur.company_id = c.id
    WHERE c.group_id = groups.id AND ur.user_id = auth.uid() AND ur.role = 'owner'::app_role
  ));

-- 4. kam_assignments: scope to company
DROP POLICY IF EXISTS "Owners manage KAM assignments" ON kam_assignments;
CREATE POLICY "Owners manage their company KAM assignments"
  ON kam_assignments FOR ALL TO authenticated
  USING (has_company_access(auth.uid(), company_id) AND has_role(auth.uid(), 'owner'::app_role, company_id))
  WITH CHECK (has_company_access(auth.uid(), company_id) AND has_role(auth.uid(), 'owner'::app_role, company_id));

-- 5. tax_rules: system-wide, restrict writes to platform admins
DROP POLICY IF EXISTS "Owners can manage tax rules" ON tax_rules;
CREATE POLICY "Platform admins can manage tax rules"
  ON tax_rules FOR ALL
  USING (is_platform_admin(auth.uid()))
  WITH CHECK (is_platform_admin(auth.uid()));

-- 6. data_retention_policies: system-wide, restrict to platform admins
DROP POLICY IF EXISTS "Only owners can manage retention policies" ON data_retention_policies;
DROP POLICY IF EXISTS "Only owners can view retention policies" ON data_retention_policies;
CREATE POLICY "Platform admins can manage retention policies"
  ON data_retention_policies FOR ALL
  USING (is_platform_admin(auth.uid()))
  WITH CHECK (is_platform_admin(auth.uid()));

-- 7. system_health_logs: platform admins only
DROP POLICY IF EXISTS "Only owners can view health logs" ON system_health_logs;
CREATE POLICY "Platform admins can view health logs"
  ON system_health_logs FOR SELECT
  USING (is_platform_admin(auth.uid()));

-- 8. admin_notifications: scope to company
DROP POLICY IF EXISTS "Owners can view admin notifications" ON admin_notifications;
DROP POLICY IF EXISTS "Owners can update admin notifications" ON admin_notifications;
CREATE POLICY "Owners can view their company notifications"
  ON admin_notifications FOR SELECT
  USING (
    (company_id IS NULL AND is_platform_admin(auth.uid()))
    OR (company_id IS NOT NULL AND has_company_access(auth.uid(), company_id) AND has_role(auth.uid(), 'owner'::app_role, company_id))
  );
CREATE POLICY "Owners can update their company notifications"
  ON admin_notifications FOR UPDATE
  USING (
    (company_id IS NULL AND is_platform_admin(auth.uid()))
    OR (company_id IS NOT NULL AND has_company_access(auth.uid(), company_id) AND has_role(auth.uid(), 'owner'::app_role, company_id))
  )
  WITH CHECK (
    (company_id IS NULL AND is_platform_admin(auth.uid()))
    OR (company_id IS NOT NULL AND has_company_access(auth.uid(), company_id) AND has_role(auth.uid(), 'owner'::app_role, company_id))
  );

-- 9. user_error_tracking: platform admins + own errors
DROP POLICY IF EXISTS "Owners can view all errors" ON user_error_tracking;
CREATE POLICY "Platform admins or own errors"
  ON user_error_tracking FOR SELECT
  USING (is_platform_admin(auth.uid()) OR auth.uid() = user_id);

-- 10. expense_claim_files: drop unscoped SELECT
DROP POLICY IF EXISTS "Users can view files for accessible claims" ON expense_claim_files;

-- 11. expense_claim_comments: scope to company
DROP POLICY IF EXISTS "Users can view comments for accessible claims" ON expense_claim_comments;
CREATE POLICY "Users can view comments for their company claims"
  ON expense_claim_comments FOR SELECT TO authenticated
  USING (expense_claim_id IN (
    SELECT ec.id FROM expense_claims ec
    WHERE ec.company_id IN (SELECT ur.company_id FROM user_roles ur WHERE ur.user_id = auth.uid())
  ));

-- 12. expense-receipts storage: scope to company
DROP POLICY IF EXISTS "Users can view expense receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload expense receipts" ON storage.objects;
CREATE POLICY "Users can view their company expense receipts"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'expense-receipts'
    AND EXISTS (
      SELECT 1 FROM expense_claim_files ecf
      JOIN expense_claims ec ON ec.id = ecf.expense_claim_id
      JOIN user_roles ur ON ur.company_id = ec.company_id
      WHERE ecf.file_url LIKE '%' || objects.name AND ur.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can upload to their company expense receipts"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'expense-receipts' AND auth.uid() IS NOT NULL);

-- 13. documents storage INSERT: require user_roles membership
DROP POLICY IF EXISTS "Company members can upload documents" ON storage.objects;
CREATE POLICY "Company members can upload documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents' AND auth.uid() IS NOT NULL
    AND EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid())
  );
