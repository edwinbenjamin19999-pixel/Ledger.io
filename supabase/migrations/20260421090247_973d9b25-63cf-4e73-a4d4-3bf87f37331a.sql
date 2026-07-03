CREATE TABLE public.support_incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  company_id UUID,
  incident_type TEXT NOT NULL,
  classification TEXT,
  module TEXT,
  error_message TEXT,
  context JSONB DEFAULT '{}'::jsonb,
  actions_taken JSONB DEFAULT '[]'::jsonb,
  outcome TEXT,
  escalated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_incidents_user ON public.support_incidents(user_id, created_at DESC);
CREATE INDEX idx_support_incidents_company ON public.support_incidents(company_id, created_at DESC);
CREATE INDEX idx_support_incidents_module_class ON public.support_incidents(module, classification);

ALTER TABLE public.support_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own incidents"
ON public.support_incidents FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own incidents"
ON public.support_incidents FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Admins can view all incidents"
ON public.support_incidents FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
