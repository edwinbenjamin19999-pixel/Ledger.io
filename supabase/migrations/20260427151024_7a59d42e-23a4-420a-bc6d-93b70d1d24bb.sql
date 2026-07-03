ALTER TABLE public.firm_clients
  ADD COLUMN IF NOT EXISTS monthly_fee numeric DEFAULT 0;

ALTER TABLE public.accounting_firms
  ADD COLUMN IF NOT EXISTS default_hourly_rate numeric DEFAULT 750;