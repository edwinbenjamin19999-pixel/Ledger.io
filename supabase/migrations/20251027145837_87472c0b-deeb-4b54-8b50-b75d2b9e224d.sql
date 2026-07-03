-- Add tax and termination fields to employees table
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS tax_table TEXT,
ADD COLUMN IF NOT EXISTS tax_column INTEGER,
ADD COLUMN IF NOT EXISTS municipality TEXT,
ADD COLUMN IF NOT EXISTS notice_period_months INTEGER DEFAULT 1;

-- Create payroll adjustments table for overtime, bonuses, sick leave, etc.
CREATE TABLE IF NOT EXISTS public.payroll_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_line_id UUID NOT NULL REFERENCES public.payroll_lines(id) ON DELETE CASCADE,
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('overtime_50', 'overtime_100', 'bonus', 'sick_leave', 'vacation_pay', 'other_addition', 'other_deduction')),
  description TEXT,
  amount NUMERIC NOT NULL,
  hours NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id)
);

-- Enable RLS on payroll_adjustments
ALTER TABLE public.payroll_adjustments ENABLE ROW LEVEL SECURITY;

-- RLS policies for payroll_adjustments
CREATE POLICY "Users can view payroll adjustments"
  ON public.payroll_adjustments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM payroll_lines pl
      JOIN payroll_runs pr ON pr.id = pl.payroll_run_id
      WHERE pl.id = payroll_adjustments.payroll_line_id
      AND has_company_access(auth.uid(), pr.company_id)
    )
  );

CREATE POLICY "Owners and accountants can manage payroll adjustments"
  ON public.payroll_adjustments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM payroll_lines pl
      JOIN payroll_runs pr ON pr.id = pl.payroll_run_id
      WHERE pl.id = payroll_adjustments.payroll_line_id
      AND has_company_access(auth.uid(), pr.company_id)
      AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'accountant'))
    )
  );

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_payroll_adjustments_payroll_line_id ON public.payroll_adjustments(payroll_line_id);

-- Create function to automatically create journal entries when payroll is approved
CREATE OR REPLACE FUNCTION public.create_payroll_journal_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_journal_entry_id UUID;
  v_salary_account_id UUID;
  v_tax_account_id UUID;
  v_social_fees_account_id UUID;
  v_liability_account_id UUID;
BEGIN
  -- Only create journal entry when status changes to 'approved'
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    
    -- Get account IDs for payroll posting (create default accounts if they don't exist)
    -- Account 7010: Salaries
    SELECT id INTO v_salary_account_id
    FROM chart_of_accounts
    WHERE company_id = NEW.company_id
    AND account_number = '7010'
    LIMIT 1;
    
    IF v_salary_account_id IS NULL THEN
      INSERT INTO chart_of_accounts (company_id, account_number, account_name, account_type, created_at)
      VALUES (NEW.company_id, '7010', 'Löner', 'expense', now())
      RETURNING id INTO v_salary_account_id;
    END IF;
    
    -- Account 2710: Tax payable
    SELECT id INTO v_tax_account_id
    FROM chart_of_accounts
    WHERE company_id = NEW.company_id
    AND account_number = '2710'
    LIMIT 1;
    
    IF v_tax_account_id IS NULL THEN
      INSERT INTO chart_of_accounts (company_id, account_number, account_name, account_type, created_at)
      VALUES (NEW.company_id, '2710', 'Avräkning skatter och avgifter', 'liability', now())
      RETURNING id INTO v_tax_account_id;
    END IF;
    
    -- Account 7510: Social fees
    SELECT id INTO v_social_fees_account_id
    FROM chart_of_accounts
    WHERE company_id = NEW.company_id
    AND account_number = '7510'
    LIMIT 1;
    
    IF v_social_fees_account_id IS NULL THEN
      INSERT INTO chart_of_accounts (company_id, account_number, account_name, account_type, created_at)
      VALUES (NEW.company_id, '7510', 'Arbetsgivaravgifter', 'expense', now())
      RETURNING id INTO v_social_fees_account_id;
    END IF;
    
    -- Account 2730: Salary payable
    SELECT id INTO v_liability_account_id
    FROM chart_of_accounts
    WHERE company_id = NEW.company_id
    AND account_number = '2730'
    LIMIT 1;
    
    IF v_liability_account_id IS NULL THEN
      INSERT INTO chart_of_accounts (company_id, account_number, account_name, account_type, created_at)
      VALUES (NEW.company_id, '2730', 'Skuld till anställda', 'liability', now())
      RETURNING id INTO v_liability_account_id;
    END IF;
    
    -- Create journal entry
    INSERT INTO journal_entries (
      company_id,
      entry_date,
      description,
      status,
      created_by,
      approved_by
    ) VALUES (
      NEW.company_id,
      NEW.payment_date,
      'Lönekörning ' || to_char(NEW.period_start::date, 'YYYY-MM'),
      'approved',
      NEW.created_by,
      NEW.approved_by
    ) RETURNING id INTO v_journal_entry_id;
    
    -- Create journal entry lines
    -- Debit: Salary expense
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit)
    VALUES (v_journal_entry_id, v_salary_account_id, NEW.total_gross, 0);
    
    -- Debit: Social fees expense
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit)
    VALUES (v_journal_entry_id, v_social_fees_account_id, NEW.total_employer_cost - NEW.total_gross, 0);
    
    -- Credit: Tax payable
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit)
    VALUES (v_journal_entry_id, v_tax_account_id, 0, NEW.total_tax + (NEW.total_employer_cost - NEW.total_gross));
    
    -- Credit: Salary payable (net to employees)
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit)
    VALUES (v_journal_entry_id, v_liability_account_id, 0, NEW.total_net);
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for automatic journal entry creation
DROP TRIGGER IF EXISTS trigger_create_payroll_journal_entry ON public.payroll_runs;
CREATE TRIGGER trigger_create_payroll_journal_entry
  AFTER UPDATE ON public.payroll_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.create_payroll_journal_entry();