-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule automatic bank transaction sync every hour
SELECT cron.schedule(
  'auto-sync-bank-transactions',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
        url:='https://gvlzltcwdsglmkiijlie.supabase.co/functions/v1/auto-sync-bank-transactions',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2bHpsdGN3ZHNnbG1raWlqbGllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMjE0NDcsImV4cCI6MjA3Njg5NzQ0N30.lUZtLRnPU3Qoy1xIR4BNaI7zRFIANw6W3zN7D7XlPKw"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);

-- Create notifications table for bank events
CREATE TABLE IF NOT EXISTS public.bank_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- 'low_balance', 'new_transaction', 'sync_failed', 'requisition_expiring'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info', -- 'info', 'warning', 'error'
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.bank_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view notifications for accessible companies"
  ON public.bank_notifications FOR SELECT
  USING (has_company_access(auth.uid(), company_id));

CREATE POLICY "Users can update their notifications"
  ON public.bank_notifications FOR UPDATE
  USING (has_company_access(auth.uid(), company_id));

-- Create index for faster queries
CREATE INDEX idx_bank_notifications_company_id ON public.bank_notifications(company_id);
CREATE INDEX idx_bank_notifications_unread ON public.bank_notifications(company_id, is_read) WHERE is_read = false;

-- Function to create notification for low balance
CREATE OR REPLACE FUNCTION check_low_balance_and_notify()
RETURNS TRIGGER AS $$
DECLARE
  low_balance_threshold NUMERIC := 10000; -- 10,000 SEK threshold
BEGIN
  IF NEW.balance < low_balance_threshold AND (OLD.balance IS NULL OR OLD.balance >= low_balance_threshold) THEN
    INSERT INTO public.bank_notifications (
      company_id,
      bank_account_id,
      notification_type,
      title,
      message,
      severity
    ) VALUES (
      NEW.company_id,
      NEW.id,
      'low_balance',
      'Lågt saldo',
      'Kontot ' || NEW.account_name || ' har ett saldo under ' || low_balance_threshold || ' ' || NEW.currency,
      'warning'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for low balance notifications
CREATE TRIGGER trigger_low_balance_notification
  AFTER UPDATE OF balance ON public.bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION check_low_balance_and_notify();

-- Function to notify about new transactions
CREATE OR REPLACE FUNCTION notify_new_transactions()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify for significant transactions (> 5000 SEK)
  IF ABS(NEW.amount) > 5000 THEN
    INSERT INTO public.bank_notifications (
      company_id,
      bank_account_id,
      notification_type,
      title,
      message,
      severity
    ) VALUES (
      NEW.company_id,
      NEW.bank_account_id,
      'new_transaction',
      'Ny transaktion',
      'Ny transaktion på ' || NEW.amount || ' ' || NEW.currency || ' från ' || COALESCE(NEW.counterparty_name, 'okänd motpart'),
      'info'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for new transaction notifications
CREATE TRIGGER trigger_new_transaction_notification
  AFTER INSERT ON public.bank_transactions
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_transactions();