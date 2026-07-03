ALTER TABLE public.annual_reports
  ADD COLUMN IF NOT EXISTS bolagsverket_manual_reference text,
  ADD COLUMN IF NOT EXISTS bolagsverket_manual_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS bolagsverket_filing_fee_paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS bolagsverket_deadline date,
  ADD COLUMN IF NOT EXISTS bolagsverket_notes text,
  ADD COLUMN IF NOT EXISTS bolagsverket_last_reminder_at timestamptz,
  ADD COLUMN IF NOT EXISTS bolagsverket_last_reminder_kind text;

ALTER TABLE public.ar_versions
  ADD COLUMN IF NOT EXISTS is_named boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS change_summary text;

CREATE INDEX IF NOT EXISTS idx_ar_versions_named
  ON public.ar_versions (annual_report_id, is_named DESC, version_number DESC);

CREATE TABLE IF NOT EXISTS public.ar_bv_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  annual_report_id uuid NOT NULL REFERENCES public.annual_reports(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  reminder_kind text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  recipients text[] NOT NULL DEFAULT '{}',
  email_id text,
  status text NOT NULL DEFAULT 'sent',
  error text,
  UNIQUE (annual_report_id, reminder_kind)
);

CREATE INDEX IF NOT EXISTS idx_ar_bv_reminders_company
  ON public.ar_bv_reminders (company_id, sent_at DESC);

ALTER TABLE public.ar_bv_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users in company can read bv reminders" ON public.ar_bv_reminders;
CREATE POLICY "Users in company can read bv reminders"
  ON public.ar_bv_reminders
  FOR SELECT
  TO authenticated
  USING (public.has_company_access(auth.uid(), company_id));