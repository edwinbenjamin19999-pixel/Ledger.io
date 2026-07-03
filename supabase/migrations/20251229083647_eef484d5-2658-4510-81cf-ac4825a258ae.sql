-- Fix the duplicate check trigger to use valid status values
CREATE OR REPLACE FUNCTION public.check_duplicate_journal_entry()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  existing_entry_id uuid;
BEGIN
  -- Only block if exact same document_id (most reliable duplicate indicator)
  IF NEW.document_id IS NOT NULL THEN
    SELECT id INTO existing_entry_id
    FROM journal_entries
    WHERE document_id = NEW.document_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    LIMIT 1;
    
    IF existing_entry_id IS NOT NULL THEN
      RAISE EXCEPTION 'Dubblett upptäckt: Dokumentet är redan bokfört (verifikat %)' , existing_entry_id;
    END IF;
  END IF;
  
  -- For manual entries without document, check for same day + exact description match
  -- within 5 minutes to prevent accidental double-clicks
  IF NEW.document_id IS NULL THEN
    SELECT id INTO existing_entry_id
    FROM journal_entries
    WHERE company_id = NEW.company_id
      AND entry_date = NEW.entry_date
      AND description = NEW.description
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND created_at > NOW() - INTERVAL '5 minutes'
    LIMIT 1;
    
    IF existing_entry_id IS NOT NULL THEN
      RAISE EXCEPTION 'Möjlig dubblett: Samma beskrivning och datum inom 5 minuter. Befintligt verifikat: %', existing_entry_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;