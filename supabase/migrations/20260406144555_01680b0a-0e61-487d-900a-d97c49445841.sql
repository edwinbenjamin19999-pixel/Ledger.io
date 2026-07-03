-- Update payroll trigger to set series_code = 'LN'
CREATE OR REPLACE FUNCTION public.create_payroll_journal_entry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_journal_entry_id UUID;
  v_salary_account_id UUID;
  v_tax_account_id UUID;
  v_social_fees_account_id UUID;
  v_liability_account_id UUID;
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    SELECT id INTO v_salary_account_id FROM chart_of_accounts WHERE company_id = NEW.company_id AND account_number = '7010' LIMIT 1;
    IF v_salary_account_id IS NULL THEN
      INSERT INTO chart_of_accounts (company_id, account_number, account_name, account_type, created_at) VALUES (NEW.company_id, '7010', 'Löner', 'expense', now()) RETURNING id INTO v_salary_account_id;
    END IF;
    SELECT id INTO v_tax_account_id FROM chart_of_accounts WHERE company_id = NEW.company_id AND account_number = '2710' LIMIT 1;
    IF v_tax_account_id IS NULL THEN
      INSERT INTO chart_of_accounts (company_id, account_number, account_name, account_type, created_at) VALUES (NEW.company_id, '2710', 'Avräkning skatter och avgifter', 'liability', now()) RETURNING id INTO v_tax_account_id;
    END IF;
    SELECT id INTO v_social_fees_account_id FROM chart_of_accounts WHERE company_id = NEW.company_id AND account_number = '7510' LIMIT 1;
    IF v_social_fees_account_id IS NULL THEN
      INSERT INTO chart_of_accounts (company_id, account_number, account_name, account_type, created_at) VALUES (NEW.company_id, '7510', 'Arbetsgivaravgifter', 'expense', now()) RETURNING id INTO v_social_fees_account_id;
    END IF;
    SELECT id INTO v_liability_account_id FROM chart_of_accounts WHERE company_id = NEW.company_id AND account_number = '2730' LIMIT 1;
    IF v_liability_account_id IS NULL THEN
      INSERT INTO chart_of_accounts (company_id, account_number, account_name, account_type, created_at) VALUES (NEW.company_id, '2730', 'Skuld till anställda', 'liability', now()) RETURNING id INTO v_liability_account_id;
    END IF;
    INSERT INTO journal_entries (company_id, entry_date, description, status, created_by, approved_by, series_code)
    VALUES (NEW.company_id, NEW.payment_date, 'Lönekörning ' || to_char(NEW.period_start::date, 'YYYY-MM'), 'approved', NEW.created_by, NEW.approved_by, 'LN')
    RETURNING id INTO v_journal_entry_id;
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit) VALUES (v_journal_entry_id, v_salary_account_id, NEW.total_gross, 0);
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit) VALUES (v_journal_entry_id, v_social_fees_account_id, NEW.total_employer_cost - NEW.total_gross, 0);
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit) VALUES (v_journal_entry_id, v_tax_account_id, 0, NEW.total_tax + (NEW.total_employer_cost - NEW.total_gross));
    INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit) VALUES (v_journal_entry_id, v_liability_account_id, 0, NEW.total_net);
  END IF;
  RETURN NEW;
END;
$$;