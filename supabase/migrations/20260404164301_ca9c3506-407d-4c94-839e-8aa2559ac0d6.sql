
-- 1. BALANCE ENFORCEMENT: Prevent approving unbalanced journal entries
CREATE OR REPLACE FUNCTION public.enforce_journal_balance_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_debit numeric;
  v_total_credit numeric;
  v_line_count integer;
  v_diff numeric;
BEGIN
  -- Only enforce when status changes to 'approved'
  IF NEW.status = 'approved' AND (OLD IS NULL OR OLD.status != 'approved') THEN
    
    -- Count lines
    SELECT COUNT(*), COALESCE(SUM(debit), 0), COALESCE(SUM(credit), 0)
    INTO v_line_count, v_total_debit, v_total_credit
    FROM journal_entry_lines
    WHERE journal_entry_id = NEW.id;
    
    -- Must have at least 2 lines
    IF v_line_count < 2 THEN
      RAISE EXCEPTION 'Verifikation måste ha minst 2 konteringsrader (har %)', v_line_count;
    END IF;
    
    -- Debit must equal credit (tolerance 0.01 kr)
    v_diff := ABS(v_total_debit - v_total_credit);
    IF v_diff > 0.01 THEN
      RAISE EXCEPTION 'Debet (% kr) och kredit (% kr) balanserar inte. Differens: % kr', 
        ROUND(v_total_debit, 2), ROUND(v_total_credit, 2), ROUND(v_diff, 2);
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_journal_balance ON public.journal_entries;
CREATE TRIGGER trg_enforce_journal_balance
  BEFORE UPDATE OF status ON public.journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_journal_balance_on_approval();

-- Also enforce on INSERT (for auto-approved entries from AI)
DROP TRIGGER IF EXISTS trg_enforce_journal_balance_insert ON public.journal_entries;
CREATE TRIGGER trg_enforce_journal_balance_insert
  AFTER INSERT ON public.journal_entries
  FOR EACH ROW
  WHEN (NEW.status = 'approved')
  EXECUTE FUNCTION public.enforce_journal_balance_on_approval();


-- 2. DUPLICATE PREVENTION: Block identical entries within 5 minutes
CREATE OR REPLACE FUNCTION public.prevent_duplicate_journal_entry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_existing_id uuid;
  v_new_total numeric;
BEGIN
  -- Skip if no description (can't detect duplicates without it)
  IF NEW.description IS NULL OR NEW.description = '' THEN
    RETURN NEW;
  END IF;

  -- Calculate the total amount for the new entry
  -- (We check this AFTER insert for the lines, but for now check by description+date+company)
  SELECT je.id INTO v_existing_id
  FROM journal_entries je
  WHERE je.company_id = NEW.company_id
    AND je.description = NEW.description
    AND je.entry_date = NEW.entry_date
    AND je.id != NEW.id
    AND je.created_at > NOW() - INTERVAL '5 minutes'
    AND je.status != 'deleted'
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RAISE EXCEPTION 'Möjlig dubblettbokning: en identisk verifikation (%) skapades inom de senaste 5 minuterna', NEW.description;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_journal ON public.journal_entries;
CREATE TRIGGER trg_prevent_duplicate_journal
  BEFORE INSERT ON public.journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_duplicate_journal_entry();


-- 3. VAT AMOUNT VALIDATION: Ensure VAT amounts are consistent with rates
CREATE OR REPLACE FUNCTION public.validate_vat_on_journal_lines()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_base_amount numeric;
  v_expected_vat numeric;
  v_vat_rate numeric;
  v_tolerance numeric := 2; -- Allow 2 kr rounding tolerance
BEGIN
  -- Only validate if VAT code is set and non-zero
  IF NEW.vat_code IS NOT NULL AND NEW.vat_code NOT IN ('0', 'none', '') THEN
    v_vat_rate := NEW.vat_code::numeric;
    
    -- Validate rate is a known Swedish VAT rate
    IF v_vat_rate NOT IN (6, 12, 25) THEN
      RAISE EXCEPTION 'Ogiltig momssats: %%%. Giltiga satser: 6%%, 12%%, 25%%', v_vat_rate;
    END IF;
    
    -- Validate VAT amount if provided
    IF NEW.vat_amount IS NOT NULL AND NEW.vat_amount > 0 THEN
      v_base_amount := GREATEST(COALESCE(NEW.debit, 0), COALESCE(NEW.credit, 0));
      
      IF v_base_amount > 0 THEN
        -- Expected VAT from gross amount: amount * rate / (100 + rate)
        v_expected_vat := ROUND(v_base_amount * v_vat_rate / (100 + v_vat_rate), 2);
        
        -- Also check net-based: amount * rate / 100
        -- Accept either calculation method
        IF ABS(NEW.vat_amount - v_expected_vat) > v_tolerance 
           AND ABS(NEW.vat_amount - ROUND(v_base_amount * v_vat_rate / 100, 2)) > v_tolerance THEN
          RAISE WARNING 'Momsbelopp (% kr) avviker från förväntat (% kr) för sats %%%. Kontrollera beräkningen.', 
            ROUND(NEW.vat_amount, 2), ROUND(v_expected_vat, 2), v_vat_rate;
          -- Warning only, don't block — but log it
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_vat_lines ON public.journal_entry_lines;
CREATE TRIGGER trg_validate_vat_lines
  BEFORE INSERT OR UPDATE ON public.journal_entry_lines
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_vat_on_journal_lines();
