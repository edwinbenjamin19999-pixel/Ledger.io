-- Enable realtime for journal_entries and journal_entry_lines tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.journal_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.journal_entry_lines;