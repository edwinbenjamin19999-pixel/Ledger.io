CREATE OR REPLACE FUNCTION public.prevent_duplicate_journal_entry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_existing_id uuid;
  v_new_total numeric;
BEGIN
  IF NEW.description IS NULL OR NEW.description = '' THEN
    RETURN NEW;
  END IF;

  SELECT je.id INTO v_existing_id
  FROM journal_entries je
  WHERE je.company_id = NEW.company_id
    AND je.description = NEW.description
    AND je.entry_date = NEW.entry_date
    AND je.id != NEW.id
    AND je.created_at > NOW() - INTERVAL '5 minutes'
    AND je.status::text != 'deleted'
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RAISE EXCEPTION 'Möjlig dubblettbokning: en identisk verifikation (%) skapades inom de senaste 5 minuterna', NEW.description;
  END IF;

  RETURN NEW;
END;
$function$;