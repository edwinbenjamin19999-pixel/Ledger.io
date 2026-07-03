CREATE OR REPLACE FUNCTION public.cleanup_orphaned_sie_import_entries(_company_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _deleted INTEGER := 0;
BEGIN
  DELETE FROM public.journal_entries je
  WHERE je.company_id = _company_id
    AND je.source = 'sie_import'
    AND NOT EXISTS (
      SELECT 1
      FROM public.journal_entry_lines jel
      WHERE jel.journal_entry_id = je.id
    );

  GET DIAGNOSTICS _deleted = ROW_COUNT;
  RETURN _deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_orphaned_sie_import_entries(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_orphaned_sie_import_entries(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.cleanup_orphaned_sie_import_entries(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_orphaned_sie_import_entries(UUID) TO service_role;

NOTIFY pgrst, 'reload schema';