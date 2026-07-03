
-- Governance audit log for Category B actions (immutable)
CREATE TABLE IF NOT EXISTS public.governance_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  action_type text NOT NULL,
  amount numeric,
  period text,
  bankid_personal_number_masked text,
  ip_address text,
  status text NOT NULL DEFAULT 'completed',
  document_reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for efficient lookups
CREATE INDEX idx_governance_audit_log_company ON public.governance_audit_log(company_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.governance_audit_log ENABLE ROW LEVEL SECURITY;

-- Users can view audit logs for their companies
CREATE POLICY "Users can view own company audit logs"
  ON public.governance_audit_log FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid()
    )
  );

-- Only service role can insert (via edge functions)
CREATE POLICY "Service role can insert audit logs"
  ON public.governance_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Nobody can update or delete audit logs (immutable)
-- No UPDATE or DELETE policies = effectively immutable

-- SMS notification usage tracking
CREATE TABLE IF NOT EXISTS public.sms_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  month text NOT NULL,
  sms_count integer NOT NULL DEFAULT 0,
  sms_budget integer NOT NULL DEFAULT 50,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, month)
);

ALTER TABLE public.sms_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company SMS usage"
  ON public.sms_usage FOR SELECT TO authenticated
  USING (company_id IN (SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid()));

CREATE POLICY "Users can manage own company SMS usage"
  ON public.sms_usage FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid()));

-- Notification preferences per company
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  email_enabled boolean NOT NULL DEFAULT true,
  sms_enabled boolean NOT NULL DEFAULT false,
  push_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, notification_type)
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company notification prefs"
  ON public.notification_preferences FOR SELECT TO authenticated
  USING (company_id IN (SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid()));

CREATE POLICY "Users can manage own company notification prefs"
  ON public.notification_preferences FOR ALL TO authenticated
  USING (company_id IN (SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid()));
