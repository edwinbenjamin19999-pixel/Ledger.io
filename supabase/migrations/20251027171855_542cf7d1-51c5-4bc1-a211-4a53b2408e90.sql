-- GDPR Compliance Implementation

-- 1. Consent Management Table
CREATE TABLE IF NOT EXISTS public.user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL, -- 'necessary', 'analytics', 'marketing', 'data_processing'
  consent_given BOOLEAN NOT NULL DEFAULT false,
  consent_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  withdrawn_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, consent_type)
);

ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own consents"
ON public.user_consents
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own consents"
ON public.user_consents
FOR ALL
USING (auth.uid() = user_id);

-- 2. Data Retention Settings
CREATE TABLE IF NOT EXISTS public.data_retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL UNIQUE,
  retention_days INTEGER NOT NULL,
  date_column TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Default retention policies (7 years for accounting data per Swedish law)
INSERT INTO public.data_retention_policies (table_name, retention_days, date_column) VALUES
  ('audit_events', 2555, 'created_at'), -- 7 years
  ('documents', 2555, 'created_at'),
  ('journal_entries', 2555, 'created_at'),
  ('invoices', 2555, 'created_at'),
  ('bank_transactions', 2555, 'created_at')
ON CONFLICT (table_name) DO NOTHING;

ALTER TABLE public.data_retention_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only owners can view retention policies"
ON public.data_retention_policies
FOR SELECT
USING (has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Only owners can manage retention policies"
ON public.data_retention_policies
FOR ALL
USING (has_role(auth.uid(), 'owner'::app_role));

-- 3. Enhanced Audit Logging for GDPR
-- Add columns to audit_events for GDPR tracking
ALTER TABLE public.audit_events 
ADD COLUMN IF NOT EXISTS data_subject_id UUID,
ADD COLUMN IF NOT EXISTS processing_purpose TEXT,
ADD COLUMN IF NOT EXISTS legal_basis TEXT, -- 'consent', 'contract', 'legal_obligation', 'legitimate_interest'
ADD COLUMN IF NOT EXISTS data_categories TEXT[]; -- e.g., ['personal_identity', 'financial', 'employment']

-- Create index for faster GDPR queries
CREATE INDEX IF NOT EXISTS idx_audit_events_data_subject ON public.audit_events(data_subject_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_entity_type ON public.audit_events(entity_type, created_at);

-- 4. Data Export Requests Table
CREATE TABLE IF NOT EXISTS public.data_export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  export_url TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);

ALTER TABLE public.data_export_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own export requests"
ON public.data_export_requests
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create export requests"
ON public.data_export_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 5. Account Deletion Requests Table
CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'cancelled'
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  scheduled_deletion_date TIMESTAMP WITH TIME ZONE, -- 30 days grace period
  completed_at TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT,
  UNIQUE(user_id, status)
);

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own deletion requests"
ON public.account_deletion_requests
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create deletion requests"
ON public.account_deletion_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can cancel own deletion requests"
ON public.account_deletion_requests
FOR UPDATE
USING (auth.uid() = user_id AND status = 'pending');

-- 6. Function to log data access (GDPR Article 30)
CREATE OR REPLACE FUNCTION public.log_data_access(
  p_user_id UUID,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_action TEXT,
  p_data_categories TEXT[],
  p_purpose TEXT DEFAULT NULL,
  p_legal_basis TEXT DEFAULT 'legitimate_interest'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  INSERT INTO public.audit_events (
    user_id,
    entity_type,
    entity_id,
    event_type,
    data_subject_id,
    data_categories,
    processing_purpose,
    legal_basis,
    company_id
  ) VALUES (
    auth.uid(),
    p_entity_type,
    p_entity_id,
    p_action,
    p_user_id,
    p_data_categories,
    p_purpose,
    p_legal_basis,
    NULL
  ) RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$;

-- 7. Function to check if user has given consent
CREATE OR REPLACE FUNCTION public.has_consent(
  p_user_id UUID,
  p_consent_type TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_consents
    WHERE user_id = p_user_id
      AND consent_type = p_consent_type
      AND consent_given = true
      AND withdrawn_at IS NULL
  );
$$;

-- 8. Create trigger to automatically log certain data accesses
CREATE OR REPLACE FUNCTION public.auto_log_sensitive_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log access to employee personal data
  IF TG_TABLE_NAME = 'employees' THEN
    PERFORM public.log_data_access(
      NEW.id,
      'employee',
      NEW.id,
      TG_OP,
      ARRAY['personal_identity', 'financial', 'employment'],
      'HR and payroll management',
      'contract'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Apply trigger to sensitive tables
DROP TRIGGER IF EXISTS log_employee_access ON public.employees;
CREATE TRIGGER log_employee_access
  AFTER INSERT OR UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_log_sensitive_access();

-- 9. Add updated_at trigger to new tables
CREATE TRIGGER update_user_consents_updated_at
  BEFORE UPDATE ON public.user_consents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_data_retention_policies_updated_at
  BEFORE UPDATE ON public.data_retention_policies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();