-- Fix the overly permissive UPDATE policy for rpa_sessions
-- Drop the old policy and create a proper one that only allows service_role updates

DROP POLICY IF EXISTS "Service role can update RPA sessions" ON public.rpa_sessions;

-- Create a more restrictive policy - users can update their own sessions
CREATE POLICY "Users can update own RPA sessions"
  ON public.rpa_sessions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);