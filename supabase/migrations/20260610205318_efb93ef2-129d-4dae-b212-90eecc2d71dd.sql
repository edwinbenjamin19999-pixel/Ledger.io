DROP INDEX IF EXISTS public.journal_entries_sie_import_dedupe_idx;

CREATE UNIQUE INDEX IF NOT EXISTS journal_entries_sie_import_dedupe_idx
ON public.journal_entries (company_id, COALESCE(series_code, ''), COALESCE(journal_number, ''), entry_date)
WHERE source = 'sie_import';

CREATE OR REPLACE FUNCTION public.import_sie_journal_entry(
  _company_id UUID,
  _entry_date DATE,
  _description TEXT,
  _created_by UUID,
  _series_code TEXT,
  _series_number INTEGER,
  _journal_number TEXT,
  _session_id UUID,
  _lines JSONB,
  _approved BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _existing_id UUID;
  _entry_id UUID;
  _line_count INTEGER;
  _line JSONB;
BEGIN
  IF _company_id IS NULL OR _entry_date IS NULL OR _created_by IS NULL THEN
    RAISE EXCEPTION 'SIE-import saknar obligatoriskt huvudfält';
  END IF;

  _line_count := COALESCE(jsonb_array_length(_lines), 0);
  IF _line_count < 2 THEN
    RAISE EXCEPTION 'SIE-verifikation % saknar tillräckligt många rader (%).', COALESCE(_journal_number, ''), _line_count;
  END IF;

  SELECT id INTO _existing_id
  FROM public.journal_entries
  WHERE company_id = _company_id
    AND source = 'sie_import'
    AND COALESCE(series_code, '') = COALESCE(_series_code, '')
    AND COALESCE(journal_number, '') = COALESCE(_journal_number, '')
    AND entry_date = _entry_date
  LIMIT 1;

  IF _existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'skipped', 'journal_entry_id', _existing_id, 'line_count', 0);
  END IF;

  INSERT INTO public.journal_entries (
    company_id,
    entry_date,
    description,
    status,
    created_by,
    series_code,
    series_number,
    journal_number,
    source,
    import_session_id
  ) VALUES (
    _company_id,
    _entry_date,
    _description,
    'draft',
    _created_by,
    COALESCE(NULLIF(_series_code, ''), 'A'),
    _series_number,
    _journal_number,
    'sie_import',
    _session_id
  )
  RETURNING id INTO _entry_id;

  FOR _line IN SELECT * FROM jsonb_array_elements(_lines)
  LOOP
    INSERT INTO public.journal_entry_lines (
      journal_entry_id,
      account_id,
      debit,
      credit,
      vat_code,
      vat_amount,
      dimension,
      description
    ) VALUES (
      _entry_id,
      (_line->>'account_id')::UUID,
      COALESCE((_line->>'debit')::NUMERIC, 0),
      COALESCE((_line->>'credit')::NUMERIC, 0),
      NULLIF(_line->>'vat_code', ''),
      COALESCE(NULLIF(_line->>'vat_amount', '')::NUMERIC, 0),
      NULLIF(_line->>'dimension', ''),
      NULLIF(_line->>'description', '')
    );
  END LOOP;

  IF _approved THEN
    UPDATE public.journal_entries
    SET status = 'approved', updated_at = now()
    WHERE id = _entry_id;
  END IF;

  RETURN jsonb_build_object('status', 'inserted', 'journal_entry_id', _entry_id, 'line_count', _line_count);
END;
$$;

REVOKE ALL ON FUNCTION public.import_sie_journal_entry(UUID, DATE, TEXT, UUID, TEXT, INTEGER, TEXT, UUID, JSONB, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.import_sie_journal_entry(UUID, DATE, TEXT, UUID, TEXT, INTEGER, TEXT, UUID, JSONB, BOOLEAN) FROM anon;
REVOKE ALL ON FUNCTION public.import_sie_journal_entry(UUID, DATE, TEXT, UUID, TEXT, INTEGER, TEXT, UUID, JSONB, BOOLEAN) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.import_sie_journal_entry(UUID, DATE, TEXT, UUID, TEXT, INTEGER, TEXT, UUID, JSONB, BOOLEAN) TO service_role;

NOTIFY pgrst, 'reload schema';