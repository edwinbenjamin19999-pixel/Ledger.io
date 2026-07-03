-- ============================================================
-- Fix 1: Add company_id to all has_role() calls in RLS policies
-- ============================================================

-- agi_periods
DROP POLICY IF EXISTS "Owners and accountants can manage AGI periods" ON agi_periods;
CREATE POLICY "Owners and accountants can manage AGI periods" ON agi_periods FOR ALL TO authenticated
USING (has_company_access(auth.uid(), company_id) AND (has_role(auth.uid(), 'owner'::app_role, company_id) OR has_role(auth.uid(), 'accountant'::app_role, company_id)))
WITH CHECK (has_company_access(auth.uid(), company_id) AND (has_role(auth.uid(), 'owner'::app_role, company_id) OR has_role(auth.uid(), 'accountant'::app_role, company_id)));

-- agi_submissions
DROP POLICY IF EXISTS "Owners and accountants can manage AGI submissions" ON agi_submissions;
CREATE POLICY "Owners and accountants can manage AGI submissions" ON agi_submissions FOR ALL TO authenticated
USING (has_company_access(auth.uid(), company_id) AND (has_role(auth.uid(), 'owner'::app_role, company_id) OR has_role(auth.uid(), 'accountant'::app_role, company_id)))
WITH CHECK (has_company_access(auth.uid(), company_id) AND (has_role(auth.uid(), 'owner'::app_role, company_id) OR has_role(auth.uid(), 'accountant'::app_role, company_id)));

-- ai_feedback
DROP POLICY IF EXISTS "Accountants can insert feedback" ON ai_feedback;
CREATE POLICY "Accountants can insert feedback" ON ai_feedback FOR INSERT TO authenticated
WITH CHECK (has_company_access(auth.uid(), company_id) AND (has_role(auth.uid(), 'owner'::app_role, company_id) OR has_role(auth.uid(), 'accountant'::app_role, company_id) OR has_role(auth.uid(), 'auditor'::app_role, company_id)));

-- bank_accounts
DROP POLICY IF EXISTS "Owners and accountants can manage bank accounts" ON bank_accounts;
CREATE POLICY "Owners and accountants can manage bank accounts" ON bank_accounts FOR ALL TO authenticated
USING (has_company_access(auth.uid(), company_id) AND (has_role(auth.uid(), 'owner'::app_role, company_id) OR has_role(auth.uid(), 'accountant'::app_role, company_id)))
WITH CHECK (has_company_access(auth.uid(), company_id) AND (has_role(auth.uid(), 'owner'::app_role, company_id) OR has_role(auth.uid(), 'accountant'::app_role, company_id)));

DROP POLICY IF EXISTS "Owners and accountants can view bank accounts" ON bank_accounts;
CREATE POLICY "Owners and accountants can view bank accounts" ON bank_accounts FOR SELECT TO authenticated
USING (has_company_access(auth.uid(), company_id) AND (has_role(auth.uid(), 'owner'::app_role, company_id) OR has_role(auth.uid(), 'accountant'::app_role, company_id)));

-- bank_matching_rules
DROP POLICY IF EXISTS "Accountants can manage matching rules" ON bank_matching_rules;
CREATE POLICY "Accountants can manage matching rules" ON bank_matching_rules FOR ALL TO authenticated
USING (has_company_access(auth.uid(), company_id) AND (has_role(auth.uid(), 'owner'::app_role, company_id) OR has_role(auth.uid(), 'accountant'::app_role, company_id)))
WITH CHECK (has_company_access(auth.uid(), company_id) AND (has_role(auth.uid(), 'owner'::app_role, company_id) OR has_role(auth.uid(), 'accountant'::app_role, company_id)));

-- bank_transactions
DROP POLICY IF EXISTS "Accountants can manage bank transactions" ON bank_transactions;
CREATE POLICY "Accountants can manage bank transactions" ON bank_transactions FOR ALL TO authenticated
USING (has_company_access(auth.uid(), company_id) AND (has_role(auth.uid(), 'owner'::app_role, company_id) OR has_role(auth.uid(), 'accountant'::app_role, company_id)))
WITH CHECK (has_company_access(auth.uid(), company_id) AND (has_role(auth.uid(), 'owner'::app_role, company_id) OR has_role(auth.uid(), 'accountant'::app_role, company_id)));

DROP POLICY IF EXISTS "Owners and accountants can view bank transactions" ON bank_transactions;
CREATE POLICY "Owners and accountants can view bank transactions" ON bank_transactions FOR SELECT TO authenticated
USING (has_company_access(auth.uid(), company_id) AND (has_role(auth.uid(), 'owner'::app_role, company_id) OR has_role(auth.uid(), 'accountant'::app_role, company_id)));

-- budgets
DROP POLICY IF EXISTS "Owners and accountants can manage budgets" ON budgets;
CREATE POLICY "Owners and accountants can manage budgets" ON budgets FOR ALL TO authenticated
USING (has_company_access(auth.uid(), company_id) AND (has_role(auth.uid(), 'owner'::app_role, company_id) OR has_role(auth.uid(), 'accountant'::app_role, company_id)))
WITH CHECK (has_company_access(auth.uid(), company_id) AND (has_role(auth.uid(), 'owner'::app_role, company_id) OR has_role(auth.uid(), 'accountant'::app_role, company_id)));

-- chart_of_accounts
DROP POLICY IF EXISTS "Owners and accountants can manage COA" ON chart_of_accounts;
CREATE POLICY "Owners and accountants can manage COA" ON chart_of_accounts FOR ALL TO authenticated
USING (has_company_access(auth.uid(), company_id) AND (has_role(auth.uid(), 'owner'::app_role, company_id) OR has_role(auth.uid(), 'accountant'::app_role, company_id)))
WITH CHECK (has_company_access(auth.uid(), company_id) AND (has_role(auth.uid(), 'owner'::app_role, company_id) OR has_role(auth.uid(), 'accountant'::app_role, company_id)));

-- company_bank_sync_status
DROP POLICY IF EXISTS "Owners can manage sync status" ON company_bank_sync_status;
CREATE POLICY "Owners can manage sync status" ON company_bank_sync_status FOR ALL TO authenticated
USING (has_company_access(auth.uid(), company_id) AND has_role(auth.uid(), 'owner'::app_role, company_id))
WITH CHECK (has_company_access(auth.uid(), company_id) AND has_role(auth.uid(), 'owner'::app_role, company_id));

-- company_settings
DROP POLICY IF EXISTS "Owners can manage company settings" ON company_settings;
CREATE POLICY "Owners can manage company settings" ON company_settings FOR ALL TO authenticated
USING (has_company_access(auth.uid(), company_id) AND has_role(auth.uid(), 'owner'::app_role, company_id))
WITH CHECK (has_company_access(auth.uid(), company_id) AND has_role(auth.uid(), 'owner'::app_role, company_id));

-- cost_centers
DROP POLICY IF EXISTS "Owners and accountants can manage cost centers" ON cost_centers;
CREATE POLICY "Owners and accountants can manage cost centers" ON cost_centers FOR ALL TO authenticated
USING (has_company_access(auth.uid(), company_id) AND (has_role(auth.uid(), 'owner'::app_role, company_id) OR has_role(auth.uid(), 'accountant'::app_role, company_id)))
WITH CHECK (has_company_access(auth.uid(), company_id) AND (has_role(auth.uid(), 'owner'::app_role, company_id) OR has_role(auth.uid(), 'accountant'::app_role, company_id)));

-- fixed_assets
DROP POLICY IF EXISTS "Owners and accountants can manage fixed assets" ON fixed_assets;
CREATE POLICY "Owners and accountants can manage fixed assets" ON fixed_assets FOR ALL TO authenticated
USING (has_company_access(auth.uid(), company_id) AND (has_role(auth.uid(), 'owner'::app_role, company_id) OR has_role(auth.uid(), 'accountant'::app_role, company_id)))
WITH CHECK (has_company_access(auth.uid(), company_id) AND (has_role(auth.uid(), 'owner'::app_role, company_id) OR has_role(auth.uid(), 'accountant'::app_role, company_id)));

-- depreciation_entries (uses join to fixed_assets for company_id)
DROP POLICY IF EXISTS "Accountants can manage depreciation entries" ON depreciation_entries;
CREATE POLICY "Accountants can manage depreciation entries" ON depreciation_entries FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM fixed_assets fa WHERE fa.id = depreciation_entries.fixed_asset_id AND has_company_access(auth.uid(), fa.company_id) AND (has_role(auth.uid(), 'owner'::app_role, fa.company_id) OR has_role(auth.uid(), 'accountant'::app_role, fa.company_id))))
WITH CHECK (EXISTS (SELECT 1 FROM fixed_assets fa WHERE fa.id = depreciation_entries.fixed_asset_id AND has_company_access(auth.uid(), fa.company_id) AND (has_role(auth.uid(), 'owner'::app_role, fa.company_id) OR has_role(auth.uid(), 'accountant'::app_role, fa.company_id))));

-- invoice_reminder_settings
DROP POLICY IF EXISTS "Owners can manage reminder settings" ON invoice_reminder_settings;
CREATE POLICY "Owners can manage reminder settings" ON invoice_reminder_settings FOR ALL TO authenticated
USING (has_company_access(auth.uid(), company_id) AND has_role(auth.uid(), 'owner'::app_role, company_id))
WITH CHECK (has_company_access(auth.uid(), company_id) AND has_role(auth.uid(), 'owner'::app_role, company_id));

-- kyc_records
DROP POLICY IF EXISTS "Auditors can view KYC records" ON kyc_records;
CREATE POLICY "Auditors can view KYC records" ON kyc_records FOR SELECT TO authenticated
USING (has_company_access(auth.uid(), company_id) AND has_role(auth.uid(), 'auditor'::app_role, company_id));

DROP POLICY IF EXISTS "Owners can manage their company KYC records" ON kyc_records;
CREATE POLICY "Owners can manage their company KYC records" ON kyc_records FOR ALL TO authenticated
USING (has_company_access(auth.uid(), company_id) AND has_role(auth.uid(), 'owner'::app_role, company_id))
WITH CHECK (has_company_access(auth.uid(), company_id) AND has_role(auth.uid(), 'owner'::app_role, company_id));

-- payroll_runs
DROP POLICY IF EXISTS "Owners and accountants can manage payroll runs" ON payroll_runs;
CREATE POLICY "Owners and accountants can manage payroll runs" ON payroll_runs FOR ALL TO authenticated
USING (has_company_access(auth.uid(), company_id) AND (has_role(auth.uid(), 'owner'::app_role, company_id) OR has_role(auth.uid(), 'accountant'::app_role, company_id)))
WITH CHECK (has_company_access(auth.uid(), company_id) AND (has_role(auth.uid(), 'owner'::app_role, company_id) OR has_role(auth.uid(), 'accountant'::app_role, company_id)));

DROP POLICY IF EXISTS "Owners and accountants can view payroll runs" ON payroll_runs;
CREATE POLICY "Owners and accountants can view payroll runs" ON payroll_runs FOR SELECT TO authenticated
USING (has_company_access(auth.uid(), company_id) AND (has_role(auth.uid(), 'owner'::app_role, company_id) OR has_role(auth.uid(), 'accountant'::app_role, company_id)));

-- payroll_lines (join to payroll_runs for company_id)
DROP POLICY IF EXISTS "Owners and accountants can manage payroll lines" ON payroll_lines;
CREATE POLICY "Owners and accountants can manage payroll lines" ON payroll_lines FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM payroll_runs pr WHERE pr.id = payroll_lines.payroll_run_id AND has_company_access(auth.uid(), pr.company_id) AND (has_role(auth.uid(), 'owner'::app_role, pr.company_id) OR has_role(auth.uid(), 'accountant'::app_role, pr.company_id))))
WITH CHECK (EXISTS (SELECT 1 FROM payroll_runs pr WHERE pr.id = payroll_lines.payroll_run_id AND has_company_access(auth.uid(), pr.company_id) AND (has_role(auth.uid(), 'owner'::app_role, pr.company_id) OR has_role(auth.uid(), 'accountant'::app_role, pr.company_id))));

DROP POLICY IF EXISTS "Owners and accountants can view payroll lines" ON payroll_lines;
CREATE POLICY "Owners and accountants can view payroll lines" ON payroll_lines FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM payroll_runs pr WHERE pr.id = payroll_lines.payroll_run_id AND has_company_access(auth.uid(), pr.company_id) AND (has_role(auth.uid(), 'owner'::app_role, pr.company_id) OR has_role(auth.uid(), 'accountant'::app_role, pr.company_id))));

-- payroll_adjustments (join to payroll_lines->payroll_runs for company_id)
DROP POLICY IF EXISTS "Owners and accountants can manage payroll adjustments" ON payroll_adjustments;
CREATE POLICY "Owners and accountants can manage payroll adjustments" ON payroll_adjustments FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM payroll_lines pl JOIN payroll_runs pr ON pr.id = pl.payroll_run_id WHERE pl.id = payroll_adjustments.payroll_line_id AND has_company_access(auth.uid(), pr.company_id) AND (has_role(auth.uid(), 'owner'::app_role, pr.company_id) OR has_role(auth.uid(), 'accountant'::app_role, pr.company_id))))
WITH CHECK (EXISTS (SELECT 1 FROM payroll_lines pl JOIN payroll_runs pr ON pr.id = pl.payroll_run_id WHERE pl.id = payroll_adjustments.payroll_line_id AND has_company_access(auth.uid(), pr.company_id) AND (has_role(auth.uid(), 'owner'::app_role, pr.company_id) OR has_role(auth.uid(), 'accountant'::app_role, pr.company_id))));

DROP POLICY IF EXISTS "Owners and accountants can view payroll adjustments" ON payroll_adjustments;
CREATE POLICY "Owners and accountants can view payroll adjustments" ON payroll_adjustments FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM payroll_lines pl JOIN payroll_runs pr ON pr.id = pl.payroll_run_id WHERE pl.id = payroll_adjustments.payroll_line_id AND has_company_access(auth.uid(), pr.company_id) AND (has_role(auth.uid(), 'owner'::app_role, pr.company_id) OR has_role(auth.uid(), 'accountant'::app_role, pr.company_id))));

-- skatteverket_credentials
DROP POLICY IF EXISTS "Owners can manage Skatteverket credentials" ON skatteverket_credentials;
CREATE POLICY "Owners can manage Skatteverket credentials" ON skatteverket_credentials FOR ALL TO authenticated
USING (has_company_access(auth.uid(), company_id) AND has_role(auth.uid(), 'owner'::app_role, company_id))
WITH CHECK (has_company_access(auth.uid(), company_id) AND has_role(auth.uid(), 'owner'::app_role, company_id));

DROP POLICY IF EXISTS "Only owners can view Skatteverket credentials" ON skatteverket_credentials;
CREATE POLICY "Only owners can view Skatteverket credentials" ON skatteverket_credentials FOR SELECT TO authenticated
USING (has_company_access(auth.uid(), company_id) AND has_role(auth.uid(), 'owner'::app_role, company_id));

-- subscriptions
DROP POLICY IF EXISTS "Owners can insert subscriptions" ON subscriptions;
CREATE POLICY "Owners can insert subscriptions" ON subscriptions FOR INSERT TO authenticated
WITH CHECK (has_company_access(auth.uid(), company_id) AND has_role(auth.uid(), 'owner'::app_role, company_id));

-- tax_mandates
DROP POLICY IF EXISTS "Owners can update mandates" ON tax_mandates;
CREATE POLICY "Owners can update mandates" ON tax_mandates FOR UPDATE TO authenticated
USING (has_company_access(auth.uid(), company_id) AND has_role(auth.uid(), 'owner'::app_role, company_id))
WITH CHECK (has_company_access(auth.uid(), company_id) AND has_role(auth.uid(), 'owner'::app_role, company_id));

-- user_invitations
DROP POLICY IF EXISTS "Owners can manage invitations" ON user_invitations;
CREATE POLICY "Owners can manage invitations" ON user_invitations FOR ALL TO authenticated
USING (has_company_access(auth.uid(), company_id) AND has_role(auth.uid(), 'owner'::app_role, company_id))
WITH CHECK (has_company_access(auth.uid(), company_id) AND has_role(auth.uid(), 'owner'::app_role, company_id));

-- validation_rules
DROP POLICY IF EXISTS "Owners and accountants can manage rules" ON validation_rules;
CREATE POLICY "Owners and accountants can manage rules" ON validation_rules FOR ALL TO authenticated
USING (has_company_access(auth.uid(), company_id) AND (has_role(auth.uid(), 'owner'::app_role, company_id) OR has_role(auth.uid(), 'accountant'::app_role, company_id)))
WITH CHECK (has_company_access(auth.uid(), company_id) AND (has_role(auth.uid(), 'owner'::app_role, company_id) OR has_role(auth.uid(), 'accountant'::app_role, company_id)));

-- vat_declarations
DROP POLICY IF EXISTS "Owners and accountants can update VAT declarations" ON vat_declarations;
CREATE POLICY "Owners and accountants can update VAT declarations" ON vat_declarations FOR UPDATE TO authenticated
USING (has_company_access(auth.uid(), company_id) AND (has_role(auth.uid(), 'owner'::app_role, company_id) OR has_role(auth.uid(), 'accountant'::app_role, company_id)))
WITH CHECK (has_company_access(auth.uid(), company_id) AND (has_role(auth.uid(), 'owner'::app_role, company_id) OR has_role(auth.uid(), 'accountant'::app_role, company_id)));

-- ============================================================
-- Fix 2: Make expense-receipts bucket private
-- ============================================================
UPDATE storage.buckets SET public = false WHERE id = 'expense-receipts';

-- ============================================================
-- Fix 3: Tighten expense-receipts INSERT policy
-- ============================================================
DROP POLICY IF EXISTS "Users can upload to their company expense receipts" ON storage.objects;
CREATE POLICY "Users can upload to their company expense receipts" ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'expense-receipts'
  AND auth.uid() IS NOT NULL
  AND EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid())
);