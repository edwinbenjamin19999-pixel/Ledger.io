-- Create table for RPA sessions (browser automation sessions)
CREATE TABLE public.rpa_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  company_id UUID NOT NULL REFERENCES public.companies(id),
  task_type TEXT NOT NULL, -- 'vat_declaration', 'agi_submission', 'annual_report'
  task_data JSONB,
  status TEXT NOT NULL DEFAULT 'pending_bankid', -- 'pending_bankid', 'bankid_verified', 'in_progress', 'completed', 'failed'
  personal_number_hash TEXT, -- Hashed for privacy
  skatteverket_reference TEXT, -- Reference number from Skatteverket
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.rpa_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own sessions
CREATE POLICY "Users can view own RPA sessions"
  ON public.rpa_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own RPA sessions"
  ON public.rpa_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role can update (for callback handling)
CREATE POLICY "Service role can update RPA sessions"
  ON public.rpa_sessions
  FOR UPDATE
  USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_rpa_sessions_updated_at
  BEFORE UPDATE ON public.rpa_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add column to automation_tasks for tracking submission method
ALTER TABLE public.automation_tasks 
ADD COLUMN IF NOT EXISTS submission_method TEXT DEFAULT 'api'; -- 'api' or 'rpa'

ALTER TABLE public.automation_tasks 
ADD COLUMN IF NOT EXISTS rpa_session_id UUID REFERENCES public.rpa_sessions(id);