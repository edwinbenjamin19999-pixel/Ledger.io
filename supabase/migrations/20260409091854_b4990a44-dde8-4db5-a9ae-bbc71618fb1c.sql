
-- Remove financial tables from realtime (no IF EXISTS in ALTER PUBLICATION)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'journal_entries'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.journal_entries;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'journal_entry_lines'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.journal_entry_lines;
  END IF;
END $$;
