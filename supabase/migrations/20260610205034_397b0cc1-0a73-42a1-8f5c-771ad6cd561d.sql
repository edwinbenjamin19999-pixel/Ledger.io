ALTER TABLE public.journal_entry_lines
ADD COLUMN IF NOT EXISTS description TEXT NULL;

ALTER TABLE public.journal_entries
ADD COLUMN IF NOT EXISTS source TEXT NULL;

ALTER TABLE public.journal_entries
ADD COLUMN IF NOT EXISTS import_session_id UUID NULL REFERENCES public.sie_import_sessions(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS journal_entries_sie_import_dedupe_idx
ON public.journal_entries (company_id, COALESCE(series_code, ''), COALESCE(series_number, 0), entry_date)
WHERE source = 'sie_import';

NOTIFY pgrst, 'reload schema';