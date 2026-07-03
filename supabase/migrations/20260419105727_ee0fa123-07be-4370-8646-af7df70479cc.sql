ALTER TABLE public.automation_settings
  ADD COLUMN IF NOT EXISTS auto_send_reminders_after_days integer,
  ADD COLUMN IF NOT EXISTS auto_defer_noncritical_payments boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_prioritize_largest_ar boolean NOT NULL DEFAULT false;

ALTER TABLE public.system_action_log
  ADD COLUMN IF NOT EXISTS reversible_until timestamptz;