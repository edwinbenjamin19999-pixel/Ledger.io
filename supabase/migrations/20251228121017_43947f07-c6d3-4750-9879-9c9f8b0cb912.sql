-- Fix security warnings: Set search_path on all functions
ALTER FUNCTION check_duplicate_journal_entry() SET search_path = public;
ALTER FUNCTION find_matching_entry_for_receipt(uuid, uuid, numeric, date) SET search_path = public;
ALTER FUNCTION link_receipt_to_entry(uuid, uuid, numeric, text) SET search_path = public;