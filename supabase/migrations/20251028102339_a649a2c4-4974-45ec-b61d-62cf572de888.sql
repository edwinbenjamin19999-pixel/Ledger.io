-- Fix RLS policy for system_health_logs to allow edge function writes

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Service role can insert health logs" ON public.system_health_logs;

-- Create new policy that allows authenticated service users to insert
CREATE POLICY "Allow edge functions to insert health logs"
ON public.system_health_logs
FOR INSERT
TO authenticated, service_role
WITH CHECK (true);

-- Ensure SELECT policy exists for authenticated users
DROP POLICY IF EXISTS "Authenticated users can view health logs" ON public.system_health_logs;

CREATE POLICY "Authenticated users can view health logs"
ON public.system_health_logs
FOR SELECT
TO authenticated
USING (true);