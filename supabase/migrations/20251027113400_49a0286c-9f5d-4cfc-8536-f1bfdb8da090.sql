-- Delete test journal entries and their related lines
DELETE FROM journal_entry_lines WHERE journal_entry_id IN ('2e9fb73b-36de-4bbc-bf43-d2fd6d8a75c6', '8191f059-63c0-4c4c-94b7-3fb928b9bcf0');
DELETE FROM journal_entries WHERE id IN ('2e9fb73b-36de-4bbc-bf43-d2fd6d8a75c6', '8191f059-63c0-4c4c-94b7-3fb928b9bcf0');