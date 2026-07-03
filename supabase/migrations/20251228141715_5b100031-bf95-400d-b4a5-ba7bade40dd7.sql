-- Add performance indexes for scaling to thousands of customers
-- Index for bank_accounts lookups by company
CREATE INDEX IF NOT EXISTS idx_bank_accounts_company_id ON public.bank_accounts(company_id);

-- Index for filtering active accounts needing sync
CREATE INDEX IF NOT EXISTS idx_bank_accounts_sync_status ON public.bank_accounts(is_active, last_synced_at);

-- Index for bank_transactions by company (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_bank_transactions_company_id ON public.bank_transactions(company_id);

-- Index for bank_transactions by bank account (for loading account transactions)
CREATE INDEX IF NOT EXISTS idx_bank_transactions_bank_account_id ON public.bank_transactions(bank_account_id);

-- Composite index for transaction lookups (date range queries per account)
CREATE INDEX IF NOT EXISTS idx_bank_transactions_account_date ON public.bank_transactions(bank_account_id, booking_date DESC);

-- Index for pending transactions (AI categorization queue)
CREATE INDEX IF NOT EXISTS idx_bank_transactions_status ON public.bank_transactions(status) WHERE status = 'pending';

-- Index for bank_notifications by company
CREATE INDEX IF NOT EXISTS idx_bank_notifications_company_id ON public.bank_notifications(company_id);

-- Index for unread notifications
CREATE INDEX IF NOT EXISTS idx_bank_notifications_unread ON public.bank_notifications(company_id, is_read) WHERE is_read = false;