
CREATE OR REPLACE FUNCTION public.flag_suspicious_entry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total_debit numeric;
  total_credit numeric;
  line_count int;
  max_amount numeric;
  duplicate_count int;
BEGIN
  -- Get line totals
  SELECT 
    COALESCE(SUM(debit), 0),
    COALESCE(SUM(credit), 0),
    COUNT(*),
    COALESCE(MAX(GREATEST(debit, credit)), 0)
  INTO total_debit, total_credit, line_count, max_amount
  FROM public.journal_entry_lines
  WHERE journal_entry_id = NEW.id;

  -- Check: Imbalanced entry
  IF ABS(total_debit - total_credit) > 0.01 THEN
    INSERT INTO public.flagged_transactions (company_id, journal_entry_id, flag_type, severity, description)
    VALUES (NEW.company_id, NEW.id, 'imbalanced', 'critical',
      'Debet och kredit balanserar inte: debet=' || total_debit || ' kredit=' || total_credit);
  END IF;

  -- Check: Unusually large amount (>500k SEK)
  IF max_amount > 500000 THEN
    INSERT INTO public.flagged_transactions (company_id, journal_entry_id, flag_type, severity, description)
    VALUES (NEW.company_id, NEW.id, 'unusual_amount', 'high',
      'Ovanligt stort belopp: ' || max_amount || ' SEK. Bör granskas.');
  END IF;

  -- Check: Perfectly round large numbers
  IF max_amount >= 10000 AND max_amount = FLOOR(max_amount) AND MOD(max_amount::bigint, 1000) = 0 THEN
    INSERT INTO public.flagged_transactions (company_id, journal_entry_id, flag_type, severity, description)
    VALUES (NEW.company_id, NEW.id, 'round_number', 'low',
      'Jämnt belopp (' || max_amount || ' SEK) — kan vara en uppskattning istället för faktiskt underlag.');
  END IF;

  -- Check: Missing document reference (use document_id instead of document_url)
  IF NEW.document_id IS NULL THEN
    INSERT INTO public.flagged_transactions (company_id, journal_entry_id, flag_type, severity, description)
    VALUES (NEW.company_id, NEW.id, 'missing_document', 'medium',
      'Verifikation saknar bifogat underlag.');
  END IF;

  -- Check: Duplicate suspect (same description + total within 24h)
  SELECT COUNT(*) INTO duplicate_count
  FROM public.journal_entries je
  WHERE je.company_id = NEW.company_id
    AND je.id != NEW.id
    AND je.description = NEW.description
    AND je.created_at > (NEW.created_at - interval '24 hours');

  IF duplicate_count > 0 THEN
    INSERT INTO public.flagged_transactions (company_id, journal_entry_id, flag_type, severity, description)
    VALUES (NEW.company_id, NEW.id, 'duplicate_suspect', 'high',
      'Möjlig dubblett — liknande verifikation hittades inom 24 timmar.');
  END IF;

  RETURN NEW;
END;
$$;
