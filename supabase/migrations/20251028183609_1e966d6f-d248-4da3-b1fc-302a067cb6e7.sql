-- Add missing columns to invoices table
ALTER TABLE invoices 
  ADD COLUMN IF NOT EXISTS sent_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS journal_entry_id uuid REFERENCES journal_entries(id);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_invoices_journal_entry ON invoices(journal_entry_id);

-- Add comments
COMMENT ON COLUMN invoices.sent_at IS 'Timestamp when the invoice was sent to customer';
COMMENT ON COLUMN invoices.journal_entry_id IS 'Reference to the journal entry created when invoice was sent';