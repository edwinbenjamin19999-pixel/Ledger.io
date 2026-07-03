-- Fix RLS policies for sensitive employee data
-- Drop existing policies for employees table
DROP POLICY IF EXISTS "Owners and accountants can manage employees" ON employees;
DROP POLICY IF EXISTS "Users can view employees for accessible companies" ON employees;

-- Create more restrictive policies for employees
CREATE POLICY "Owners and accountants can manage employees"
ON employees
FOR ALL
USING (
  has_company_access(auth.uid(), company_id) 
  AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'accountant'::app_role))
);

CREATE POLICY "Owners and accountants can view all employee data"
ON employees
FOR SELECT
USING (
  has_company_access(auth.uid(), company_id)
  AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'accountant'::app_role))
);

-- Fix RLS policies for payroll data
DROP POLICY IF EXISTS "Owners and accountants can manage payroll runs" ON payroll_runs;
DROP POLICY IF EXISTS "Users can view payroll runs for accessible companies" ON payroll_runs;

CREATE POLICY "Owners and accountants can manage payroll runs"
ON payroll_runs
FOR ALL
USING (
  has_company_access(auth.uid(), company_id)
  AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'accountant'::app_role))
);

CREATE POLICY "Owners and accountants can view payroll runs"
ON payroll_runs
FOR SELECT
USING (
  has_company_access(auth.uid(), company_id)
  AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'accountant'::app_role))
);

-- Fix RLS for bank accounts (remove view access for all users)
DROP POLICY IF EXISTS "Users can view bank accounts for accessible companies" ON bank_accounts;

CREATE POLICY "Owners and accountants can view bank accounts"
ON bank_accounts
FOR SELECT
USING (
  has_company_access(auth.uid(), company_id)
  AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'accountant'::app_role))
);

-- Fix RLS for bank transactions
DROP POLICY IF EXISTS "Users can view bank transactions for accessible companies" ON bank_transactions;

CREATE POLICY "Owners and accountants can view bank transactions"
ON bank_transactions
FOR SELECT
USING (
  has_company_access(auth.uid(), company_id)
  AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'accountant'::app_role))
);

-- Fix RLS for Skatteverket credentials (only owners should see these)
DROP POLICY IF EXISTS "Users can view Skatteverket credentials for accessible companie" ON skatteverket_credentials;

CREATE POLICY "Only owners can view Skatteverket credentials"
ON skatteverket_credentials
FOR SELECT
USING (
  has_company_access(auth.uid(), company_id)
  AND has_role(auth.uid(), 'owner'::app_role)
);

-- Fix RLS for payroll lines
DROP POLICY IF EXISTS "Users can view payroll lines" ON payroll_lines;

CREATE POLICY "Owners and accountants can view payroll lines"
ON payroll_lines
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM payroll_runs pr
    WHERE pr.id = payroll_lines.payroll_run_id
    AND has_company_access(auth.uid(), pr.company_id)
    AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'accountant'::app_role))
  )
);

-- Fix RLS for payroll adjustments
DROP POLICY IF EXISTS "Users can view payroll adjustments" ON payroll_adjustments;

CREATE POLICY "Owners and accountants can view payroll adjustments"
ON payroll_adjustments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM payroll_lines pl
    JOIN payroll_runs pr ON pr.id = pl.payroll_run_id
    WHERE pl.id = payroll_adjustments.payroll_line_id
    AND has_company_access(auth.uid(), pr.company_id)
    AND (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'accountant'::app_role))
  )
);