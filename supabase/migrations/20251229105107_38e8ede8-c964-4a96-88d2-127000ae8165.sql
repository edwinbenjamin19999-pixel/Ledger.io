-- Add reminder tracking columns to invoices table
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS invoice_direction text NOT NULL DEFAULT 'outgoing' CHECK (invoice_direction IN ('incoming', 'outgoing')),
ADD COLUMN IF NOT EXISTS reminder_count integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_reminder_sent_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS collection_status text DEFAULT 'none' CHECK (collection_status IN ('none', 'reminder_1', 'reminder_2', 'pending_collection', 'sent_to_collection', 'paid')),
ADD COLUMN IF NOT EXISTS sent_to_collection_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS collection_reference text;

-- Create company reminder settings table
CREATE TABLE IF NOT EXISTS public.invoice_reminder_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  days_until_first_reminder integer NOT NULL DEFAULT 7,
  days_until_second_reminder integer NOT NULL DEFAULT 14,
  days_until_collection integer NOT NULL DEFAULT 10,
  reminder_email_subject_1 text DEFAULT 'Påminnelse: Förfallen faktura',
  reminder_email_subject_2 text DEFAULT 'Andra påminnelse: Förfallen faktura',
  collection_provider text DEFAULT 'billecta',
  collection_api_key_encrypted text,
  is_automatic_reminders_enabled boolean NOT NULL DEFAULT true,
  is_automatic_collection_enabled boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

-- Create reminder history table
CREATE TABLE IF NOT EXISTS public.invoice_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  reminder_number integer NOT NULL,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  sent_to_email text NOT NULL,
  email_subject text,
  email_body text,
  delivery_status text DEFAULT 'sent'
);

-- Enable RLS
ALTER TABLE public.invoice_reminder_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_reminders ENABLE ROW LEVEL SECURITY;

-- RLS policies for reminder settings
CREATE POLICY "Owners can manage reminder settings"
ON public.invoice_reminder_settings
FOR ALL
USING (has_company_access(auth.uid(), company_id) AND has_role(auth.uid(), 'owner'::app_role))
WITH CHECK (has_company_access(auth.uid(), company_id) AND has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Users can view reminder settings"
ON public.invoice_reminder_settings
FOR SELECT
USING (has_company_access(auth.uid(), company_id));

-- RLS policies for reminder history
CREATE POLICY "Users can view invoice reminders"
ON public.invoice_reminders
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM invoices i 
  WHERE i.id = invoice_reminders.invoice_id 
  AND has_company_access(auth.uid(), i.company_id)
));

CREATE POLICY "Service role can manage reminders"
ON public.invoice_reminders
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Create index for efficient querying of overdue invoices
CREATE INDEX IF NOT EXISTS idx_invoices_overdue ON public.invoices(company_id, invoice_direction, status, due_date) 
WHERE invoice_direction = 'outgoing' AND status NOT IN ('paid', 'cancelled');