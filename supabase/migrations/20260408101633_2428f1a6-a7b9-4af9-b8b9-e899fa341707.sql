
-- Function to auto-classify series_code based on journal entry content
CREATE OR REPLACE FUNCTION public.classify_journal_series()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_desc text;
  v_has_income_account boolean := false;
  v_has_expense_account boolean := false;
  v_has_bank_account boolean := false;
  v_has_salary_account boolean := false;
  v_has_balance_only boolean := true;
  v_account_numbers text[];
BEGIN
  -- Only classify if series_code is not already set
  IF NEW.series_code IS NOT NULL AND NEW.series_code != '' THEN
    RETURN NEW;
  END IF;

  v_desc := LOWER(COALESCE(NEW.description, ''));

  -- Check description patterns first (highest confidence)
  -- IB = Ingående balans
  IF v_desc LIKE '%ingående balans%' OR v_desc LIKE '%ib import%' OR v_desc LIKE '%ib sie%' THEN
    NEW.series_code := 'IB';
    RETURN NEW;
  END IF;

  -- LN = Lönebokföring
  IF v_desc LIKE '%lönekörning%' OR v_desc LIKE '%löneutbetalning%' OR v_desc LIKE '%löne%' THEN
    NEW.series_code := 'LN';
    RETURN NEW;
  END IF;

  -- HB = Huvudboksposter (year-end, tax, depreciation)
  IF v_desc LIKE '%bokslut%' OR v_desc LIKE '%årsbokslut%' OR v_desc LIKE '%avskrivning%' 
     OR v_desc LIKE '%periodisering%' OR v_desc LIKE '%bolagsskatt%'
     OR v_desc LIKE '%årets resultat%' OR v_desc LIKE '%överföring%resultat%' THEN
    NEW.series_code := 'HB';
    RETURN NEW;
  END IF;

  -- F = Kundfaktura (outgoing invoice)
  IF v_desc LIKE '%kundfaktura%' OR v_desc LIKE '%utgående faktura%' 
     OR (v_desc LIKE 'faktura inv-%' AND v_desc NOT LIKE '%leverantör%') THEN
    NEW.series_code := 'F';
    RETURN NEW;
  END IF;

  -- L = Leverantörsfaktura
  IF v_desc LIKE '%leverantörsfaktura%' OR v_desc LIKE '%leverantörs%' 
     OR v_desc LIKE '%inkommande faktura%' OR v_desc LIKE '%inköp%' THEN
    NEW.series_code := 'L';
    RETURN NEW;
  END IF;

  -- B = Bankverifikation
  IF v_desc LIKE '%bank%' OR v_desc LIKE '%betalning%' OR v_desc LIKE '%insättning%' 
     OR v_desc LIKE '%uttag%' OR v_desc LIKE '%överföring%' AND v_desc NOT LIKE '%resultat%' THEN
    NEW.series_code := 'B';
    RETURN NEW;
  END IF;

  -- LB = Likvidbokföring (payment of invoice)
  IF v_desc LIKE '%likvidbok%' OR v_desc LIKE '%betalning leverantörsfaktura%'
     OR v_desc LIKE '%betalning%faktura%' THEN
    NEW.series_code := 'LB';
    RETURN NEW;
  END IF;

  -- Default: try to classify based on linked accounts (deferred to after insert via a separate mechanism)
  -- For now, if we have a document_id, it's likely a supplier invoice
  IF NEW.document_id IS NOT NULL THEN
    NEW.series_code := 'L';
    RETURN NEW;
  END IF;

  -- Fallback: M = Manuell bokföring
  NEW.series_code := 'M';
  RETURN NEW;
END;
$$;

-- Create trigger for auto-classification on INSERT
DROP TRIGGER IF EXISTS auto_classify_journal_series ON journal_entries;
CREATE TRIGGER auto_classify_journal_series
  BEFORE INSERT ON journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION classify_journal_series();

-- Now update all existing entries that lack a series_code
-- using the same logic applied manually
UPDATE journal_entries SET series_code = 'IB'
WHERE (series_code IS NULL OR series_code = '')
  AND (LOWER(description) LIKE '%ingående balans%' OR LOWER(description) LIKE '%ib import%');

UPDATE journal_entries SET series_code = 'LN'
WHERE (series_code IS NULL OR series_code = '')
  AND (LOWER(description) LIKE '%lönekörning%' OR LOWER(description) LIKE '%löneutbetalning%' OR LOWER(description) LIKE '%löne%');

UPDATE journal_entries SET series_code = 'HB'
WHERE (series_code IS NULL OR series_code = '')
  AND (LOWER(description) LIKE '%bokslut%' OR LOWER(description) LIKE '%avskrivning%'
       OR LOWER(description) LIKE '%periodisering%' OR LOWER(description) LIKE '%bolagsskatt%'
       OR LOWER(description) LIKE '%årets resultat%');

UPDATE journal_entries SET series_code = 'F'
WHERE (series_code IS NULL OR series_code = '')
  AND (LOWER(description) LIKE '%kundfaktura%' OR LOWER(description) LIKE '%utgående faktura%');

UPDATE journal_entries SET series_code = 'LB'
WHERE (series_code IS NULL OR series_code = '')
  AND (LOWER(description) LIKE '%betalning leverantörsfaktura%' OR LOWER(description) LIKE '%betalning%faktura%');

UPDATE journal_entries SET series_code = 'L'
WHERE (series_code IS NULL OR series_code = '')
  AND (LOWER(description) LIKE '%leverantörsfaktura%' OR LOWER(description) LIKE '%leverantörs%'
       OR LOWER(description) LIKE '%inkommande faktura%' OR LOWER(description) LIKE '%inköp%'
       OR document_id IS NOT NULL);

UPDATE journal_entries SET series_code = 'B'
WHERE (series_code IS NULL OR series_code = '')
  AND (LOWER(description) LIKE '%bank%' OR LOWER(description) LIKE '%betalning%'
       OR LOWER(description) LIKE '%insättning%' OR LOWER(description) LIKE '%uttag%');

-- Remaining unclassified -> attempt account-based classification
-- Entries with income accounts (3xxx) = F
UPDATE journal_entries je SET series_code = 'F'
WHERE (je.series_code IS NULL OR je.series_code = '')
  AND EXISTS (
    SELECT 1 FROM journal_entry_lines jel
    JOIN chart_of_accounts coa ON coa.id = jel.account_id
    WHERE jel.journal_entry_id = je.id
      AND coa.account_number LIKE '3%'
      AND jel.credit > 0
  );

-- Entries with expense accounts (4xxx-6xxx) and supplier liability (2440) = L
UPDATE journal_entries je SET series_code = 'L'
WHERE (je.series_code IS NULL OR je.series_code = '')
  AND EXISTS (
    SELECT 1 FROM journal_entry_lines jel
    JOIN chart_of_accounts coa ON coa.id = jel.account_id
    WHERE jel.journal_entry_id = je.id
      AND coa.account_number LIKE '24%'
  );

-- Entries touching bank accounts (19xx) = B
UPDATE journal_entries je SET series_code = 'B'
WHERE (je.series_code IS NULL OR je.series_code = '')
  AND EXISTS (
    SELECT 1 FROM journal_entry_lines jel
    JOIN chart_of_accounts coa ON coa.id = jel.account_id
    WHERE jel.journal_entry_id = je.id
      AND coa.account_number LIKE '19%'
  );

-- Final fallback: everything else is M (manual)
UPDATE journal_entries SET series_code = 'M'
WHERE series_code IS NULL OR series_code = '';
