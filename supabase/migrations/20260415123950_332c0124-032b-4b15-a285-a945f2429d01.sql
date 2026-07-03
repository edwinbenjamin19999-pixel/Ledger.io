ALTER TABLE public.agent_bookings
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS balancing_account text,
  ADD COLUMN IF NOT EXISTS payment_method_confidence numeric;