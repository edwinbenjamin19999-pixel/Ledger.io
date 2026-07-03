-- Add connection_status to bank_accounts so UI can distinguish
-- live PSD2-connected accounts from stale/manual ones.
ALTER TABLE public.bank_accounts
  ADD COLUMN IF NOT EXISTS connection_status text NOT NULL DEFAULT 'manual'
  CHECK (connection_status IN ('live', 'stale', 'manual'));

-- Live = synced via Enable Banking PSD2 in last 24h
-- Stale = was live but hasn't synced in >24h
-- Manual = imported / no PSD2 connection
COMMENT ON COLUMN public.bank_accounts.connection_status IS
  'live = active PSD2 sync, stale = sync overdue, manual = no live connection';

-- Backfill: any existing row with bank_connection_id is from Enable Banking
UPDATE public.bank_accounts
SET connection_status = CASE
  WHEN bank_connection_id IS NOT NULL
       AND last_synced_at IS NOT NULL
       AND last_synced_at > now() - interval '24 hours' THEN 'live'
  WHEN bank_connection_id IS NOT NULL THEN 'stale'
  ELSE 'manual'
END;