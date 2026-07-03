-- Admin Notifications Table för systemhändelser
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  user_id UUID REFERENCES auth.users(id),
  company_id UUID REFERENCES public.companies(id),
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_unresolved ON public.admin_notifications(is_resolved, created_at DESC) WHERE is_resolved = false;
CREATE INDEX IF NOT EXISTS idx_admin_notifications_severity ON public.admin_notifications(severity, created_at DESC);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Use 'owner' role instead of 'admin'
CREATE POLICY "Owners can view admin notifications"
  ON public.admin_notifications FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'owner'
  ));

CREATE POLICY "Owners can update admin notifications"
  ON public.admin_notifications FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'owner'
  ));

CREATE POLICY "System can insert admin notifications"
  ON public.admin_notifications FOR INSERT
  WITH CHECK (true);

-- User Error Tracking
CREATE TABLE IF NOT EXISTS public.user_error_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  session_id TEXT,
  error_type TEXT NOT NULL,
  error_message TEXT,
  error_stack TEXT,
  page_url TEXT,
  user_agent TEXT,
  error_count INTEGER DEFAULT 1,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_notified BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_user_error_tracking_user ON public.user_error_tracking(user_id, last_seen_at DESC);

ALTER TABLE public.user_error_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own errors"
  ON public.user_error_tracking FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own errors"
  ON public.user_error_tracking FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Owners can view all errors"
  ON public.user_error_tracking FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'owner'
  ));

-- Linked Companies för multi-företag
CREATE TABLE IF NOT EXISTS public.linked_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  company_id UUID NOT NULL REFERENCES public.companies(id),
  personal_number_hash TEXT,
  is_primary BOOLEAN DEFAULT false,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_linked_companies_user ON public.linked_companies(user_id);
CREATE INDEX IF NOT EXISTS idx_linked_companies_personal ON public.linked_companies(personal_number_hash);

ALTER TABLE public.linked_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their linked companies"
  ON public.linked_companies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their linked companies"
  ON public.linked_companies FOR ALL
  USING (auth.uid() = user_id);

-- Function to auto-notify on repeated errors
CREATE OR REPLACE FUNCTION notify_admin_on_user_errors()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.error_count >= 5 AND NEW.is_notified = false THEN
    INSERT INTO public.admin_notifications (
      notification_type,
      severity,
      title,
      message,
      user_id,
      metadata
    ) VALUES (
      'user_stuck',
      'warning',
      'Användare har upprepade problem',
      'En användare har stött på ' || NEW.error_count || ' fel. Typ: ' || NEW.error_type,
      NEW.user_id,
      jsonb_build_object(
        'error_type', NEW.error_type,
        'error_count', NEW.error_count,
        'page_url', NEW.page_url,
        'first_seen', NEW.first_seen_at
      )
    );
    NEW.is_notified := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_admin_notify_errors
  BEFORE UPDATE ON public.user_error_tracking
  FOR EACH ROW
  EXECUTE FUNCTION notify_admin_on_user_errors();