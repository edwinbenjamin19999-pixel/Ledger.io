
-- When document_id is set on a journal entry, auto-resolve missing_document flags
CREATE OR REPLACE FUNCTION public.resolve_missing_document_flag()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If document_id was NULL and is now set, mark missing_document flags as reviewed
  IF OLD.document_id IS NULL AND NEW.document_id IS NOT NULL THEN
    UPDATE public.flagged_transactions
    SET is_reviewed = true,
        review_notes = 'Automatiskt löst — underlag bifogat',
        reviewed_at = now()
    WHERE journal_entry_id = NEW.id
      AND flag_type = 'missing_document'
      AND is_reviewed = false;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER resolve_missing_document_on_update
  AFTER UPDATE OF document_id ON public.journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.resolve_missing_document_flag();

-- Also resolve existing stale flags where document_id is already set
UPDATE public.flagged_transactions ft
SET is_reviewed = true,
    review_notes = 'Automatiskt löst — underlag bifogat',
    reviewed_at = now()
FROM public.journal_entries je
WHERE ft.journal_entry_id = je.id
  AND ft.flag_type = 'missing_document'
  AND ft.is_reviewed = false
  AND je.document_id IS NOT NULL;
