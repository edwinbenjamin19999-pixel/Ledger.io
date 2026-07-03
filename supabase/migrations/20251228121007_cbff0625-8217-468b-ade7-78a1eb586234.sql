-- First drop the trigger that depends on the function
DROP TRIGGER IF EXISTS check_duplicate_journal_entry_trigger ON journal_entries;
DROP TRIGGER IF EXISTS prevent_duplicate_journal_entry ON journal_entries;

-- Now drop and recreate the function
DROP FUNCTION IF EXISTS check_duplicate_journal_entry() CASCADE;

-- Create smarter duplicate detection that allows recurring payments
CREATE OR REPLACE FUNCTION check_duplicate_journal_entry()
RETURNS TRIGGER AS $$
DECLARE
  existing_entry_id uuid;
BEGIN
  -- Only block if exact same document_id (most reliable duplicate indicator)
  IF NEW.document_id IS NOT NULL THEN
    SELECT id INTO existing_entry_id
    FROM journal_entries
    WHERE document_id = NEW.document_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND status != 'deleted'
    LIMIT 1;
    
    IF existing_entry_id IS NOT NULL THEN
      RAISE EXCEPTION 'Dubblett upptäckt: Dokumentet är redan bokfört (verifikat %)' , existing_entry_id;
    END IF;
  END IF;
  
  -- For manual entries without document, check for same day + exact description match
  -- But ALLOW recurring payments (same amount different dates is fine)
  IF NEW.document_id IS NULL THEN
    SELECT id INTO existing_entry_id
    FROM journal_entries
    WHERE company_id = NEW.company_id
      AND entry_date = NEW.entry_date
      AND description = NEW.description
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND status != 'deleted'
      AND created_at > NOW() - INTERVAL '5 minutes'
    LIMIT 1;
    
    IF existing_entry_id IS NOT NULL THEN
      RAISE EXCEPTION 'Möjlig dubblett: Samma beskrivning och datum inom 5 minuter. Befintligt verifikat: %', existing_entry_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER prevent_duplicate_journal_entry
  BEFORE INSERT ON journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION check_duplicate_journal_entry();

-- Update find_matching_entry_for_receipt to be smarter
DROP FUNCTION IF EXISTS find_matching_entry_for_receipt(uuid, uuid, numeric, date);

CREATE OR REPLACE FUNCTION find_matching_entry_for_receipt(
  p_document_id uuid,
  p_company_id uuid,
  p_amount numeric,
  p_date date
)
RETURNS TABLE(
  journal_entry_id uuid,
  match_score numeric,
  match_reason text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    je.id as journal_entry_id,
    CASE
      WHEN ABS(COALESCE((
        SELECT SUM(COALESCE(jel.debit, 0)) 
        FROM journal_entry_lines jel 
        WHERE jel.journal_entry_id = je.id
      ), 0) - p_amount) < 1 
      AND ABS(je.entry_date - p_date) <= 3
      AND je.receipt_matched IS NOT TRUE
      THEN 0.95::numeric
      WHEN je.entry_date = p_date AND je.receipt_matched IS NOT TRUE
      THEN 0.7::numeric
      WHEN ABS(je.entry_date - p_date) <= 7 AND je.receipt_matched IS NOT TRUE
      THEN 0.5::numeric
      ELSE 0.2::numeric
    END as match_score,
    CASE
      WHEN ABS(COALESCE((
        SELECT SUM(COALESCE(jel.debit, 0)) 
        FROM journal_entry_lines jel 
        WHERE jel.journal_entry_id = je.id
      ), 0) - p_amount) < 1 AND ABS(je.entry_date - p_date) <= 3
      THEN 'Matchande belopp och datum'::text
      WHEN je.entry_date = p_date
      THEN 'Samma datum'::text
      ELSE 'Möjlig match baserat på tid'::text
    END as match_reason
  FROM journal_entries je
  WHERE je.company_id = p_company_id
    AND je.document_id IS NULL
    AND je.status IN ('draft', 'pending_approval', 'approved')
  ORDER BY match_score DESC
  LIMIT 5;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_duplicate_journal_entry() IS 
'Tillåter återkommande betalningar med samma belopp på olika datum. Blockerar endast: 1) Samma document_id, 2) Samma beskrivning+datum inom 5 min.';