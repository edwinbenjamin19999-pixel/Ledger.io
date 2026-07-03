-- Add journal_entry_id link to bank_transactions for idempotent auto-booking
ALTER TABLE public.bank_transactions
  ADD COLUMN IF NOT EXISTS journal_entry_id uuid REFERENCES public.journal_entries(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bank_transactions_je
  ON public.bank_transactions(journal_entry_id);

-- Seed Skatteverket matching rules helper (idempotent per company)
CREATE OR REPLACE FUNCTION public.seed_skv_matching_rules(p_company_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_skv_account_id uuid;
  v_count integer := 0;
  v_creator uuid;
BEGIN
  SELECT id INTO v_skv_account_id
  FROM public.chart_of_accounts
  WHERE company_id = p_company_id AND account_number = '1630'
  LIMIT 1;

  IF v_skv_account_id IS NULL THEN
    INSERT INTO public.chart_of_accounts (company_id, account_number, account_name, account_type)
    VALUES (p_company_id, '1630', 'Avräkning för skatter och avgifter (skattekonto)', 'asset')
    RETURNING id INTO v_skv_account_id;
  END IF;

  SELECT created_by INTO v_creator FROM public.companies WHERE id = p_company_id;

  -- Counterparty Skatteverket → 1630
  IF NOT EXISTS (
    SELECT 1 FROM public.bank_matching_rules
    WHERE company_id = p_company_id
      AND match_field = 'counterparty_name'
      AND match_pattern ILIKE 'skatteverket%'
  ) THEN
    INSERT INTO public.bank_matching_rules (
      company_id, rule_name, match_field, match_pattern,
      suggested_account_id, priority, auto_approve, is_active, created_by
    ) VALUES (
      p_company_id, 'Skatteverket → Skattekonto 1630',
      'counterparty_name', 'Skatteverket',
      v_skv_account_id, 90, true, true, v_creator
    );
    v_count := v_count + 1;
  END IF;

  -- BG 5050-1055 in reference → 1630
  IF NOT EXISTS (
    SELECT 1 FROM public.bank_matching_rules
    WHERE company_id = p_company_id
      AND match_field = 'reference'
      AND match_pattern ILIKE '%5050-1055%'
  ) THEN
    INSERT INTO public.bank_matching_rules (
      company_id, rule_name, match_field, match_pattern,
      suggested_account_id, priority, auto_approve, is_active, created_by
    ) VALUES (
      p_company_id, 'BG 5050-1055 (Skatteverket) → 1630',
      'reference', '5050-1055',
      v_skv_account_id, 89, true, true, v_creator
    );
    v_count := v_count + 1;
  END IF;

  RETURN v_count;
END;
$$;