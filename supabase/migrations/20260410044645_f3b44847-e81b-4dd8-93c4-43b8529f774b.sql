
-- 1. Update check constraint to allow 'duplicate' status
ALTER TABLE public.documents DROP CONSTRAINT documents_processing_status_check;
ALTER TABLE public.documents ADD CONSTRAINT documents_processing_status_check 
  CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed', 'duplicate'));

-- 2. Create trigger to auto-deduplicate on insert
CREATE OR REPLACE FUNCTION public.deduplicate_pending_documents()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Mark older pending documents with the same file_name and company as duplicates
  UPDATE documents
  SET processing_status = 'duplicate'
  WHERE company_id = NEW.company_id
    AND file_name = NEW.file_name
    AND processing_status = 'pending'
    AND id != NEW.id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_deduplicate_documents
AFTER INSERT ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.deduplicate_pending_documents();
