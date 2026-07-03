
-- =====================================================
-- SÄKERHETSFÖRBÄTTRINGAR & SKYDD MOT DUBBELBOKNING
-- =====================================================

-- 1. UNIQUE CONSTRAINT för att förhindra dubbelbokning av samma dokument
-- Ett dokument kan bara ha EN godkänd journal entry
CREATE UNIQUE INDEX IF NOT EXISTS idx_journal_entries_document_approved 
ON journal_entries(document_id) 
WHERE document_id IS NOT NULL AND status = 'approved';

-- 2. Skapa funktion för att kontrollera dubbletter innan insert
CREATE OR REPLACE FUNCTION public.check_duplicate_journal_entry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  existing_count INTEGER;
  similar_entry RECORD;
BEGIN
  -- Kolla om dokumentet redan har en godkänd journal entry
  IF NEW.document_id IS NOT NULL THEN
    SELECT COUNT(*) INTO existing_count
    FROM journal_entries
    WHERE document_id = NEW.document_id
    AND status = 'approved'
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
    
    IF existing_count > 0 THEN
      RAISE EXCEPTION 'Dokument redan bokfört. Använd det befintliga verifikatet istället.';
    END IF;
  END IF;
  
  -- Kolla efter liknande poster (samma datum, belopp, beskrivning inom 5 minuter)
  IF NEW.status = 'approved' THEN
    SELECT je.id, je.description INTO similar_entry
    FROM journal_entries je
    JOIN journal_entry_lines jel ON jel.journal_entry_id = je.id
    WHERE je.company_id = NEW.company_id
    AND je.entry_date = NEW.entry_date
    AND je.status = 'approved'
    AND je.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND je.created_at > NOW() - INTERVAL '5 minutes'
    LIMIT 1;
    
    IF similar_entry IS NOT NULL THEN
      RAISE WARNING 'Möjlig dubblettbokning upptäckt: %', similar_entry.description;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 3. Trigger för att köra dubblettkontroll
DROP TRIGGER IF EXISTS check_duplicate_journal_entry_trigger ON journal_entries;
CREATE TRIGGER check_duplicate_journal_entry_trigger
  BEFORE INSERT OR UPDATE ON journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION check_duplicate_journal_entry();

-- 4. Lägg till kolumn för att spåra kvittokoppling
ALTER TABLE journal_entries 
ADD COLUMN IF NOT EXISTS receipt_matched BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS receipt_match_confidence DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS receipt_match_method TEXT;

-- 5. Index för snabbare dubblettsökning
CREATE INDEX IF NOT EXISTS idx_journal_entries_company_date_status 
ON journal_entries(company_id, entry_date, status);

CREATE INDEX IF NOT EXISTS idx_journal_entries_created_at 
ON journal_entries(created_at DESC);

-- 6. Förbättra audit_events RLS - begränsa INSERT till service role eller edge functions
DROP POLICY IF EXISTS "System can insert audit events" ON audit_events;
CREATE POLICY "Only service role can insert audit events" 
ON audit_events 
FOR INSERT 
WITH CHECK (
  -- Tillåt insert om det kommer från en edge function (service role)
  -- eller om user_id matchar auth.uid()
  auth.uid() = user_id OR auth.role() = 'service_role'
);

-- 7. Förbättra system_health_logs RLS
DROP POLICY IF EXISTS "Allow edge functions to insert health logs" ON system_health_logs;
DROP POLICY IF EXISTS "Authenticated users can view health logs" ON system_health_logs;

CREATE POLICY "Only service role can insert health logs" 
ON system_health_logs 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Only owners can view health logs" 
ON system_health_logs 
FOR SELECT 
USING (has_role(auth.uid(), 'owner'::app_role));

-- 8. Skapa funktion för att koppla ihop kvitto med bokföring
CREATE OR REPLACE FUNCTION public.link_receipt_to_entry(
  p_document_id UUID,
  p_journal_entry_id UUID,
  p_confidence DECIMAL DEFAULT 1.0,
  p_method TEXT DEFAULT 'manual'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Uppdatera journal entry med dokument-koppling
  UPDATE journal_entries
  SET 
    document_id = p_document_id,
    receipt_matched = true,
    receipt_match_confidence = p_confidence,
    receipt_match_method = p_method,
    updated_at = NOW()
  WHERE id = p_journal_entry_id
  AND document_id IS NULL;  -- Bara om inte redan kopplad
  
  -- Uppdatera dokumentets status
  UPDATE documents
  SET processing_status = 'matched'
  WHERE id = p_document_id;
  
  RETURN FOUND;
END;
$function$;

-- 9. Skapa funktion för att hitta matchande verifikat för ett kvitto
CREATE OR REPLACE FUNCTION public.find_matching_entry_for_receipt(
  p_document_id UUID,
  p_company_id UUID,
  p_amount DECIMAL,
  p_date DATE,
  p_description TEXT DEFAULT NULL
)
RETURNS TABLE(
  journal_entry_id UUID,
  match_score DECIMAL,
  match_reason TEXT
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    je.id as journal_entry_id,
    CASE
      WHEN je.document_id = p_document_id THEN 1.0
      WHEN je.entry_date = p_date AND total_amount = p_amount THEN 0.95
      WHEN je.entry_date = p_date AND ABS(total_amount - p_amount) < 1 THEN 0.85
      WHEN ABS(je.entry_date - p_date) <= 3 AND ABS(total_amount - p_amount) < 10 THEN 0.7
      ELSE 0.5
    END::DECIMAL as match_score,
    CASE
      WHEN je.document_id = p_document_id THEN 'Redan kopplat'
      WHEN je.entry_date = p_date AND total_amount = p_amount THEN 'Exakt match på datum och belopp'
      WHEN je.entry_date = p_date AND ABS(total_amount - p_amount) < 1 THEN 'Datum matchar, belopp nära'
      ELSE 'Möjlig match'
    END as match_reason
  FROM journal_entries je
  LEFT JOIN LATERAL (
    SELECT SUM(COALESCE(debit, 0)) as total_amount
    FROM journal_entry_lines jel
    WHERE jel.journal_entry_id = je.id
  ) amounts ON true
  WHERE je.company_id = p_company_id
  AND je.status IN ('draft', 'approved')
  AND je.document_id IS NULL  -- Inte redan kopplad
  AND je.entry_date BETWEEN p_date - INTERVAL '7 days' AND p_date + INTERVAL '7 days'
  ORDER BY match_score DESC
  LIMIT 5;
END;
$function$;

-- 10. Lägg till kommentarer för dokumentation
COMMENT ON FUNCTION check_duplicate_journal_entry() IS 'Förhindrar dubbelbokning av samma dokument';
COMMENT ON FUNCTION link_receipt_to_entry(UUID, UUID, DECIMAL, TEXT) IS 'Kopplar ihop ett kvitto med ett befintligt verifikat';
COMMENT ON FUNCTION find_matching_entry_for_receipt(UUID, UUID, DECIMAL, DATE, TEXT) IS 'Hittar möjliga matchningar för ett kvitto';
