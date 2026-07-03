-- =====================================================
-- SÄKERHETSMIGRATION: Åtgärda identifierade sårbarheter
-- =====================================================

-- 1. Rensa bort klartext-personnummer och bankuppgifter (säkerställ endast krypterad data)
UPDATE public.employees 
SET 
  personal_number = '********',
  bank_account = '****'
WHERE personal_number IS NOT NULL 
  AND personal_number != '********'
  AND personal_number_encrypted IS NOT NULL;

-- 2. Skapa validerings-funktion för AGI-belopp
CREATE OR REPLACE FUNCTION public.validate_agi_submission(p_payroll_run_id uuid)
RETURNS TABLE(
  is_valid boolean,
  total_gross numeric,
  total_tax numeric,
  total_social_fees numeric,
  employee_count integer,
  validation_errors text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_errors text[] := '{}';
  v_total_gross numeric := 0;
  v_total_tax numeric := 0;
  v_total_social_fees numeric := 0;
  v_employee_count integer := 0;
  v_run_gross numeric;
  v_run_tax numeric;
  v_line record;
BEGIN
  -- Hämta payroll run data
  SELECT total_gross, total_tax INTO v_run_gross, v_run_tax
  FROM payroll_runs WHERE id = p_payroll_run_id;
  
  IF v_run_gross IS NULL THEN
    v_errors := array_append(v_errors, 'Lönekörning hittades inte');
    RETURN QUERY SELECT false, 0::numeric, 0::numeric, 0::numeric, 0, v_errors;
    RETURN;
  END IF;
  
  -- Summera och validera varje rad
  FOR v_line IN 
    SELECT pl.*, e.personal_number_encrypted
    FROM payroll_lines pl
    JOIN employees e ON e.id = pl.employee_id
    WHERE pl.payroll_run_id = p_payroll_run_id
  LOOP
    v_employee_count := v_employee_count + 1;
    v_total_gross := v_total_gross + COALESCE(v_line.gross_salary, 0);
    v_total_tax := v_total_tax + COALESCE(v_line.tax_deduction, 0);
    v_total_social_fees := v_total_social_fees + COALESCE(v_line.employer_social_fees, 0);
    
    -- Validera att anställd har krypterat personnummer
    IF v_line.personal_number_encrypted IS NULL THEN
      v_errors := array_append(v_errors, 
        'Anställd saknar krypterat personnummer (krävs för AGI)');
    END IF;
    
    -- Validera rimliga belopp
    IF v_line.gross_salary < 0 THEN
      v_errors := array_append(v_errors, 
        'Negativ bruttolön upptäckt');
    END IF;
    
    IF v_line.tax_deduction < 0 THEN
      v_errors := array_append(v_errors, 
        'Negativt skatteavdrag upptäckt');
    END IF;
    
    -- Validera att netto = brutto - skatt
    IF ABS(v_line.net_salary - (v_line.gross_salary - v_line.tax_deduction)) > 0.01 THEN
      v_errors := array_append(v_errors, 
        'Nettolön stämmer inte med brutto minus skatt');
    END IF;
  END LOOP;
  
  -- Validera totalsummor
  IF ABS(v_total_gross - v_run_gross) > 0.01 THEN
    v_errors := array_append(v_errors, 
      format('Total bruttolön stämmer inte: beräknat %s, sparat %s', v_total_gross, v_run_gross));
  END IF;
  
  IF ABS(v_total_tax - v_run_tax) > 0.01 THEN
    v_errors := array_append(v_errors, 
      format('Total skatt stämmer inte: beräknat %s, sparat %s', v_total_tax, v_run_tax));
  END IF;
  
  RETURN QUERY SELECT 
    array_length(v_errors, 1) IS NULL OR array_length(v_errors, 1) = 0,
    v_total_gross,
    v_total_tax,
    v_total_social_fees,
    v_employee_count,
    v_errors;
END;
$$;

-- 3. Skapa validerings-funktion för momsdeklaration
CREATE OR REPLACE FUNCTION public.validate_vat_declaration(p_declaration_id uuid)
RETURNS TABLE(
  is_valid boolean,
  calculated_output_vat numeric,
  calculated_input_vat numeric,
  calculated_vat_to_pay numeric,
  validation_errors text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_errors text[] := '{}';
  v_decl record;
  v_calc_output numeric;
  v_calc_vat_to_pay numeric;
BEGIN
  SELECT * INTO v_decl FROM vat_declarations WHERE id = p_declaration_id;
  
  IF v_decl IS NULL THEN
    v_errors := array_append(v_errors, 'Momsdeklaration hittades inte');
    RETURN QUERY SELECT false, 0::numeric, 0::numeric, 0::numeric, v_errors;
    RETURN;
  END IF;
  
  -- Beräkna förväntad utgående moms
  -- 25% av sales_25_percent = output_vat_25
  IF ABS((v_decl.sales_25_percent * 0.25) - v_decl.output_vat_25) > 1 THEN
    v_errors := array_append(v_errors, 
      format('Utgående moms 25%% stämmer inte: förväntat %s, deklarerat %s', 
        ROUND(v_decl.sales_25_percent * 0.25), v_decl.output_vat_25));
  END IF;
  
  -- 12% av sales_12_percent = output_vat_12
  IF ABS((v_decl.sales_12_percent * 0.12) - v_decl.output_vat_12) > 1 THEN
    v_errors := array_append(v_errors, 
      format('Utgående moms 12%% stämmer inte: förväntat %s, deklarerat %s', 
        ROUND(v_decl.sales_12_percent * 0.12), v_decl.output_vat_12));
  END IF;
  
  -- 6% av sales_6_percent = output_vat_6
  IF ABS((v_decl.sales_6_percent * 0.06) - v_decl.output_vat_6) > 1 THEN
    v_errors := array_append(v_errors, 
      format('Utgående moms 6%% stämmer inte: förväntat %s, deklarerat %s', 
        ROUND(v_decl.sales_6_percent * 0.06), v_decl.output_vat_6));
  END IF;
  
  -- Beräkna total moms att betala
  v_calc_output := COALESCE(v_decl.output_vat_25, 0) + 
                   COALESCE(v_decl.output_vat_12, 0) + 
                   COALESCE(v_decl.output_vat_6, 0);
  v_calc_vat_to_pay := v_calc_output - COALESCE(v_decl.input_vat, 0);
  
  IF ABS(v_calc_vat_to_pay - v_decl.vat_to_pay) > 1 THEN
    v_errors := array_append(v_errors, 
      format('Moms att betala stämmer inte: beräknat %s, deklarerat %s', 
        v_calc_vat_to_pay, v_decl.vat_to_pay));
  END IF;
  
  -- Kontrollera negativa värden
  IF v_decl.sales_25_percent < 0 OR v_decl.sales_12_percent < 0 OR v_decl.sales_6_percent < 0 THEN
    v_errors := array_append(v_errors, 'Negativ försäljning upptäckt');
  END IF;
  
  RETURN QUERY SELECT 
    array_length(v_errors, 1) IS NULL OR array_length(v_errors, 1) = 0,
    v_calc_output,
    COALESCE(v_decl.input_vat, 0),
    v_calc_vat_to_pay,
    v_errors;
END;
$$;

-- 4. Skapa validerings-funktion för journalposter (debet = kredit)
CREATE OR REPLACE FUNCTION public.validate_journal_balance(p_journal_entry_id uuid)
RETURNS TABLE(
  is_valid boolean,
  total_debit numeric,
  total_credit numeric,
  difference numeric,
  validation_errors text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_errors text[] := '{}';
  v_total_debit numeric := 0;
  v_total_credit numeric := 0;
  v_diff numeric;
BEGIN
  SELECT 
    COALESCE(SUM(debit), 0),
    COALESCE(SUM(credit), 0)
  INTO v_total_debit, v_total_credit
  FROM journal_entry_lines 
  WHERE journal_entry_id = p_journal_entry_id;
  
  v_diff := ABS(v_total_debit - v_total_credit);
  
  IF v_diff > 0.01 THEN
    v_errors := array_append(v_errors, 
      format('Debet och kredit balanserar inte. Differens: %s kr', ROUND(v_diff, 2)));
  END IF;
  
  IF v_total_debit = 0 AND v_total_credit = 0 THEN
    v_errors := array_append(v_errors, 'Verifikationen har inga belopp');
  END IF;
  
  RETURN QUERY SELECT 
    array_length(v_errors, 1) IS NULL OR array_length(v_errors, 1) = 0,
    v_total_debit,
    v_total_credit,
    v_diff,
    v_errors;
END;
$$;

-- 5. Lägg till RLS-policy för system_secrets (endast service_role)
DROP POLICY IF EXISTS "No public access to system secrets" ON public.system_secrets;
CREATE POLICY "No public access to system secrets" 
ON public.system_secrets 
FOR ALL 
USING (false);

-- 6. Stäng av öppen läsning av service_agreements för icke-autentiserade
DROP POLICY IF EXISTS "Anyone can view service agreements" ON public.service_agreements;
CREATE POLICY "Authenticated users can view service agreements" 
ON public.service_agreements 
FOR SELECT 
TO authenticated
USING (true);

-- 7. Skapa audit-trigger för känsliga operationer
CREATE OR REPLACE FUNCTION public.audit_sensitive_operation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_events (
    user_id,
    entity_type,
    entity_id,
    event_type,
    data_categories,
    processing_purpose,
    legal_basis
  ) VALUES (
    auth.uid(),
    TG_TABLE_NAME,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
    TG_OP || '_' || TG_TABLE_NAME,
    ARRAY['financial', 'tax_submission'],
    'Skattedeklaration och rapportering',
    'legal_obligation'
  );
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Lägg till triggers för AGI och VAT submissions
DROP TRIGGER IF EXISTS audit_agi_submissions ON public.agi_submissions;
CREATE TRIGGER audit_agi_submissions
AFTER INSERT OR UPDATE OR DELETE ON public.agi_submissions
FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_operation();

DROP TRIGGER IF EXISTS audit_vat_declarations ON public.vat_declarations;
CREATE TRIGGER audit_vat_declarations
AFTER INSERT OR UPDATE OR DELETE ON public.vat_declarations
FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_operation();