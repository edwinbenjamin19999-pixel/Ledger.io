-- Fix ALL/UPDATE policies missing WITH CHECK (corrected for tables without company_id)

-- Batch 1: Tables with company_id
DROP POLICY IF EXISTS "Owners can manage access requests" ON public.access_requests;
CREATE POLICY "Owners can manage access requests" ON public.access_requests FOR ALL TO public
USING (has_company_access(auth.uid(), company_id) AND has_role(auth.uid(), 'owner'::app_role, company_id))
WITH CHECK (has_company_access(auth.uid(), company_id) AND has_role(auth.uid(), 'owner'::app_role, company_id));

DROP POLICY IF EXISTS "Users can manage own access requests" ON public.access_requests;
CREATE POLICY "Users can manage own access requests" ON public.access_requests FOR ALL TO public
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can cancel own deletion requests" ON public.account_deletion_requests;
CREATE POLICY "Users can cancel own deletion requests" ON public.account_deletion_requests FOR UPDATE TO public
USING ((auth.uid() = user_id) AND (status = 'pending'::text))
WITH CHECK ((auth.uid() = user_id) AND (status = 'pending'::text));

DROP POLICY IF EXISTS "Owners can update admin notifications" ON public.admin_notifications;
CREATE POLICY "Owners can update admin notifications" ON public.admin_notifications FOR UPDATE TO public
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'owner'::app_role))
WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'owner'::app_role));

DROP POLICY IF EXISTS "Owners and accountants can manage AGI periods" ON public.agi_periods;
CREATE POLICY "Owners and accountants can manage AGI periods" ON public.agi_periods FOR ALL TO public
USING (has_company_access(auth.uid(), company_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'accountant'::app_role)))
WITH CHECK (has_company_access(auth.uid(), company_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'accountant'::app_role)));

DROP POLICY IF EXISTS "Owners and accountants can manage AGI submissions" ON public.agi_submissions;
CREATE POLICY "Owners and accountants can manage AGI submissions" ON public.agi_submissions FOR ALL TO public
USING (has_company_access(auth.uid(), company_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'accountant'::app_role)))
WITH CHECK (has_company_access(auth.uid(), company_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'accountant'::app_role)));

DROP POLICY IF EXISTS "Owners and accountants can update annual reports" ON public.annual_reports;
CREATE POLICY "Owners and accountants can update annual reports" ON public.annual_reports FOR UPDATE TO public
USING (has_company_access(auth.uid(), company_id) AND (has_role(auth.uid(), 'owner'::app_role, company_id) OR has_role(auth.uid(), 'accountant'::app_role, company_id)))
WITH CHECK (has_company_access(auth.uid(), company_id) AND (has_role(auth.uid(), 'owner'::app_role, company_id) OR has_role(auth.uid(), 'accountant'::app_role, company_id)));

DROP POLICY IF EXISTS "Owners can update automation settings" ON public.automation_settings;
CREATE POLICY "Owners can update automation settings" ON public.automation_settings FOR UPDATE TO public
USING (has_company_access(auth.uid(), company_id) AND has_role(auth.uid(), 'owner'::app_role, company_id))
WITH CHECK (has_company_access(auth.uid(), company_id) AND has_role(auth.uid(), 'owner'::app_role, company_id));

DROP POLICY IF EXISTS "Users can update their company automation tasks" ON public.automation_tasks;
CREATE POLICY "Users can update their company automation tasks" ON public.automation_tasks FOR UPDATE TO public
USING (has_company_access(auth.uid(), company_id)) WITH CHECK (has_company_access(auth.uid(), company_id));

DROP POLICY IF EXISTS "Owners and accountants can manage bank accounts" ON public.bank_accounts;
CREATE POLICY "Owners and accountants can manage bank accounts" ON public.bank_accounts FOR ALL TO public
USING (has_company_access(auth.uid(), company_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'accountant'::app_role)))
WITH CHECK (has_company_access(auth.uid(), company_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'accountant'::app_role)));

DROP POLICY IF EXISTS "Accountants can manage matching rules" ON public.bank_matching_rules;
CREATE POLICY "Accountants can manage matching rules" ON public.bank_matching_rules FOR ALL TO public
USING (has_company_access(auth.uid(), company_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'accountant'::app_role)))
WITH CHECK (has_company_access(auth.uid(), company_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'accountant'::app_role)));

DROP POLICY IF EXISTS "Users can update their notifications" ON public.bank_notifications;
CREATE POLICY "Users can update their notifications" ON public.bank_notifications FOR UPDATE TO public
USING (has_company_access(auth.uid(), company_id)) WITH CHECK (has_company_access(auth.uid(), company_id));

DROP POLICY IF EXISTS "Accountants can manage bank transactions" ON public.bank_transactions;
CREATE POLICY "Accountants can manage bank transactions" ON public.bank_transactions FOR ALL TO public
USING (has_company_access(auth.uid(), company_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'accountant'::app_role)))
WITH CHECK (has_company_access(auth.uid(), company_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'accountant'::app_role)));

DROP POLICY IF EXISTS "Owners and accountants can manage budgets" ON public.budgets;
CREATE POLICY "Owners and accountants can manage budgets" ON public.budgets FOR ALL TO public
USING (has_company_access(auth.uid(), company_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'accountant'::app_role)))
WITH CHECK (has_company_access(auth.uid(), company_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'accountant'::app_role)));

DROP POLICY IF EXISTS "System can manage cash flow forecasts" ON public.cash_flow_forecasts;
CREATE POLICY "System can manage cash flow forecasts" ON public.cash_flow_forecasts FOR ALL TO public
USING (has_company_access(auth.uid(), company_id)) WITH CHECK (has_company_access(auth.uid(), company_id));

DROP POLICY IF EXISTS "Owners and accountants can manage COA" ON public.chart_of_accounts;
CREATE POLICY "Owners and accountants can manage COA" ON public.chart_of_accounts FOR ALL TO public
USING (has_company_access(auth.uid(), company_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'accountant'::app_role)))
WITH CHECK (has_company_access(auth.uid(), company_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'accountant'::app_role)));

DROP POLICY IF EXISTS "Owners can update companies" ON public.companies;
CREATE POLICY "Owners can update companies" ON public.companies FOR UPDATE TO public
USING (has_role(auth.uid(), 'owner'::app_role)) WITH CHECK (has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "Service role full access" ON public.company_bank_sync_status;
CREATE POLICY "Service role full access" ON public.company_bank_sync_status FOR ALL TO public
USING (auth.role() = 'service_role'::text) WITH CHECK (auth.role() = 'service_role'::text);

DROP POLICY IF EXISTS "Owners can manage sync status" ON public.company_bank_sync_status;
CREATE POLICY "Owners can manage sync status" ON public.company_bank_sync_status FOR ALL TO public
USING (has_company_access(auth.uid(), company_id) AND has_role(auth.uid(), 'owner'::app_role))
WITH CHECK (has_company_access(auth.uid(), company_id) AND has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "Owners can manage company settings" ON public.company_settings;
CREATE POLICY "Owners can manage company settings" ON public.company_settings FOR ALL TO public
USING (has_company_access(auth.uid(), company_id) AND has_role(auth.uid(), 'owner'::app_role))
WITH CHECK (has_company_access(auth.uid(), company_id) AND has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "Owners and accountants can manage cost centers" ON public.cost_centers;
CREATE POLICY "Owners and accountants can manage cost centers" ON public.cost_centers FOR ALL TO public
USING (has_company_access(auth.uid(), company_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'accountant'::app_role)))
WITH CHECK (has_company_access(auth.uid(), company_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'accountant'::app_role)));

DROP POLICY IF EXISTS "Users can manage customers for their companies" ON public.customers;
CREATE POLICY "Users can manage customers for their companies" ON public.customers FOR ALL TO authenticated
USING ((company_id IN (SELECT id FROM companies WHERE created_by = auth.uid())) OR (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid())))
WITH CHECK ((company_id IN (SELECT id FROM companies WHERE created_by = auth.uid())) OR (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid())));

-- data_retention_policies: no company_id, global admin table
DROP POLICY IF EXISTS "Only owners can manage retention policies" ON public.data_retention_policies;
CREATE POLICY "Only owners can manage retention policies" ON public.data_retention_policies FOR ALL TO public
USING (has_role(auth.uid(), 'owner'::app_role)) WITH CHECK (has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "Accountants can manage depreciation entries" ON public.depreciation_entries;
CREATE POLICY "Accountants can manage depreciation entries" ON public.depreciation_entries FOR ALL TO public
USING (EXISTS (SELECT 1 FROM fixed_assets fa WHERE fa.id = depreciation_entries.fixed_asset_id AND has_company_access(auth.uid(), fa.company_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'accountant'::app_role))))
WITH CHECK (EXISTS (SELECT 1 FROM fixed_assets fa WHERE fa.id = depreciation_entries.fixed_asset_id AND has_company_access(auth.uid(), fa.company_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'accountant'::app_role))));

DROP POLICY IF EXISTS "CFO and owners can manage eliminations" ON public.eliminations;
CREATE POLICY "CFO and owners can manage eliminations" ON public.eliminations FOR ALL TO public
USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'cfo'::app_role))
WITH CHECK (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'cfo'::app_role));

DROP POLICY IF EXISTS "Owners and accountants can update employees" ON public.employees;
CREATE POLICY "Owners and accountants can update employees" ON public.employees FOR UPDATE TO public
USING (has_company_access(auth.uid(), company_id) AND (has_role(auth.uid(), 'owner'::app_role, company_id) OR has_role(auth.uid(), 'accountant'::app_role, company_id)))
WITH CHECK (has_company_access(auth.uid(), company_id) AND (has_role(auth.uid(), 'owner'::app_role, company_id) OR has_role(auth.uid(), 'accountant'::app_role, company_id)));

DROP POLICY IF EXISTS "Owners and accountants can manage fixed assets" ON public.fixed_assets;
CREATE POLICY "Owners and accountants can manage fixed assets" ON public.fixed_assets FOR ALL TO public
USING (has_company_access(auth.uid(), company_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'accountant'::app_role)))
WITH CHECK (has_company_access(auth.uid(), company_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'accountant'::app_role)));

-- groups: no company_id, uses created_by
DROP POLICY IF EXISTS "Owners can manage groups" ON public.groups;
CREATE POLICY "Owners can manage groups" ON public.groups FOR ALL TO public
USING (has_role(auth.uid(), 'owner'::app_role)) WITH CHECK (has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "Users can manage invoice lines" ON public.invoice_lines;
CREATE POLICY "Users can manage invoice lines" ON public.invoice_lines FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_lines.invoice_id AND has_company_access(auth.uid(), i.company_id)))
WITH CHECK (EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_lines.invoice_id AND has_company_access(auth.uid(), i.company_id)));

DROP POLICY IF EXISTS "Accountants can manage journal entries" ON public.journal_entries;
CREATE POLICY "Accountants can manage journal entries" ON public.journal_entries FOR ALL TO public
USING (has_company_access(auth.uid(), company_id)) WITH CHECK (has_company_access(auth.uid(), company_id));

DROP POLICY IF EXISTS "Accountants can manage journal entry lines" ON public.journal_entry_lines;
CREATE POLICY "Accountants can manage journal entry lines" ON public.journal_entry_lines FOR ALL TO public
USING (EXISTS (SELECT 1 FROM journal_entries je WHERE je.id = journal_entry_lines.journal_entry_id AND has_company_access(auth.uid(), je.company_id)))
WITH CHECK (EXISTS (SELECT 1 FROM journal_entries je WHERE je.id = journal_entry_lines.journal_entry_id AND has_company_access(auth.uid(), je.company_id)));

DROP POLICY IF EXISTS "Owners can manage their company KYC records" ON public.kyc_records;
CREATE POLICY "Owners can manage their company KYC records" ON public.kyc_records FOR ALL TO public
USING (has_company_access(auth.uid(), company_id) AND has_role(auth.uid(), 'owner'::app_role))
WITH CHECK (has_company_access(auth.uid(), company_id) AND has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "Users can manage their linked companies" ON public.linked_companies;
CREATE POLICY "Users can manage their linked companies" ON public.linked_companies FOR ALL TO public
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- payroll_adjustments: uses payroll_line_id -> payroll_lines -> payroll_runs
DROP POLICY IF EXISTS "Owners and accountants can manage payroll adjustments" ON public.payroll_adjustments;
CREATE POLICY "Owners and accountants can manage payroll adjustments" ON public.payroll_adjustments FOR ALL TO public
USING (EXISTS (SELECT 1 FROM payroll_lines pl JOIN payroll_runs pr ON pr.id = pl.payroll_run_id WHERE pl.id = payroll_adjustments.payroll_line_id AND has_company_access(auth.uid(), pr.company_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'accountant'::app_role))))
WITH CHECK (EXISTS (SELECT 1 FROM payroll_lines pl JOIN payroll_runs pr ON pr.id = pl.payroll_run_id WHERE pl.id = payroll_adjustments.payroll_line_id AND has_company_access(auth.uid(), pr.company_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'accountant'::app_role))));

DROP POLICY IF EXISTS "Owners and accountants can manage payroll lines" ON public.payroll_lines;
CREATE POLICY "Owners and accountants can manage payroll lines" ON public.payroll_lines FOR ALL TO public
USING (EXISTS (SELECT 1 FROM payroll_runs pr WHERE pr.id = payroll_lines.payroll_run_id AND has_company_access(auth.uid(), pr.company_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'accountant'::app_role))))
WITH CHECK (EXISTS (SELECT 1 FROM payroll_runs pr WHERE pr.id = payroll_lines.payroll_run_id AND has_company_access(auth.uid(), pr.company_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'accountant'::app_role))));

DROP POLICY IF EXISTS "Owners and accountants can manage payroll runs" ON public.payroll_runs;
CREATE POLICY "Owners and accountants can manage payroll runs" ON public.payroll_runs FOR ALL TO public
USING (has_company_access(auth.uid(), company_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'accountant'::app_role)))
WITH CHECK (has_company_access(auth.uid(), company_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'accountant'::app_role)));

-- service_agreements: no company_id, public-ish table for agreement versions
DROP POLICY IF EXISTS "Only system can manage agreements" ON public.service_agreements;
CREATE POLICY "Only system can manage agreements" ON public.service_agreements FOR ALL TO public
USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Owners can manage Skatteverket credentials" ON public.skatteverket_credentials;
CREATE POLICY "Owners can manage Skatteverket credentials" ON public.skatteverket_credentials FOR ALL TO public
USING (has_company_access(auth.uid(), company_id) AND has_role(auth.uid(), 'owner'::app_role))
WITH CHECK (has_company_access(auth.uid(), company_id) AND has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "Owners can update their subscriptions" ON public.subscriptions;
CREATE POLICY "Owners can update their subscriptions" ON public.subscriptions FOR UPDATE TO public
USING (has_company_access(auth.uid(), company_id)) WITH CHECK (has_company_access(auth.uid(), company_id));

DROP POLICY IF EXISTS "Users can manage suppliers for their companies" ON public.suppliers;
CREATE POLICY "Users can manage suppliers for their companies" ON public.suppliers FOR ALL TO authenticated
USING ((company_id IN (SELECT id FROM companies WHERE created_by = auth.uid())) OR (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid())))
WITH CHECK ((company_id IN (SELECT id FROM companies WHERE created_by = auth.uid())) OR (company_id IN (SELECT company_id FROM user_roles WHERE user_id = auth.uid())));

-- system_secrets: no company_id, keep locked
DROP POLICY IF EXISTS "No public access to system secrets" ON public.system_secrets;
CREATE POLICY "No public access to system secrets" ON public.system_secrets FOR ALL TO public
USING (false) WITH CHECK (false);

-- tax_mandates
DROP POLICY IF EXISTS "Owners can update mandates" ON public.tax_mandates;
CREATE POLICY "Owners can update mandates" ON public.tax_mandates FOR UPDATE TO public
USING (has_company_access(auth.uid(), company_id) AND has_role(auth.uid(), 'owner'::app_role))
WITH CHECK (has_company_access(auth.uid(), company_id) AND has_role(auth.uid(), 'owner'::app_role));

-- tax_rules: no company_id, global reference table
DROP POLICY IF EXISTS "Owners can manage tax rules" ON public.tax_rules;
CREATE POLICY "Owners can manage tax rules" ON public.tax_rules FOR ALL TO public
USING (has_role(auth.uid(), 'owner'::app_role)) WITH CHECK (has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "Accountants can manage transactions" ON public.transactions;
CREATE POLICY "Accountants can manage transactions" ON public.transactions FOR ALL TO public
USING (has_company_access(auth.uid(), company_id)) WITH CHECK (has_company_access(auth.uid(), company_id));

DROP POLICY IF EXISTS "Users can manage own consents" ON public.user_consents;
CREATE POLICY "Users can manage own consents" ON public.user_consents FOR ALL TO public
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Owners can manage invitations" ON public.user_invitations;
CREATE POLICY "Owners can manage invitations" ON public.user_invitations FOR ALL TO public
USING (has_company_access(auth.uid(), company_id) AND has_role(auth.uid(), 'owner'::app_role))
WITH CHECK (has_company_access(auth.uid(), company_id) AND has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "Owners can manage permissions" ON public.user_permissions;
CREATE POLICY "Owners can manage permissions" ON public.user_permissions FOR ALL TO public
USING (has_company_access(auth.uid(), company_id) AND has_role(auth.uid(), 'owner'::app_role, company_id))
WITH CHECK (has_company_access(auth.uid(), company_id) AND has_role(auth.uid(), 'owner'::app_role, company_id));

DROP POLICY IF EXISTS "Owners can manage roles" ON public.user_roles;
CREATE POLICY "Owners can manage roles" ON public.user_roles FOR ALL TO public
USING (has_role(auth.uid(), 'owner'::app_role, company_id))
WITH CHECK (has_role(auth.uid(), 'owner'::app_role, company_id));

DROP POLICY IF EXISTS "Owners and accountants can manage rules" ON public.validation_rules;
CREATE POLICY "Owners and accountants can manage rules" ON public.validation_rules FOR ALL TO public
USING (has_company_access(auth.uid(), company_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'accountant'::app_role)))
WITH CHECK (has_company_access(auth.uid(), company_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'accountant'::app_role)));

DROP POLICY IF EXISTS "Owners and accountants can update VAT declarations" ON public.vat_declarations;
CREATE POLICY "Owners and accountants can update VAT declarations" ON public.vat_declarations FOR UPDATE TO public
USING (has_company_access(auth.uid(), company_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'accountant'::app_role)))
WITH CHECK (has_company_access(auth.uid(), company_id) AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'accountant'::app_role)));