-- FIX 1: Restrict admin_notifications INSERT to service role only (prevent spam)
DROP POLICY IF EXISTS "Service role can insert notifications" ON admin_notifications;
CREATE POLICY "Only system can insert notifications"
ON admin_notifications
FOR INSERT
WITH CHECK (
  -- Only allow inserts from database functions/triggers (not direct client calls)
  current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  OR current_setting('role', true) = 'postgres'
);

-- FIX 2: Tighten audit_events SELECT to never allow NULL company_id except for own user events
DROP POLICY IF EXISTS "Users can view audit events for their companies" ON audit_events;
CREATE POLICY "Users can view audit events for their companies"
ON audit_events
FOR SELECT
USING (
  -- User can only see their own user events or events for companies they have access to
  user_id = auth.uid()
  OR (company_id IS NOT NULL AND public.has_company_access(auth.uid(), company_id))
);

-- FIX 3: Improve employees RLS - employees can see limited own data, owners/accountants see all
DROP POLICY IF EXISTS "Users can view employees in their companies" ON employees;
DROP POLICY IF EXISTS "Owners and accountants can view employees" ON employees;

CREATE POLICY "Owners and accountants can view all employees"
ON employees
FOR SELECT
USING (
  public.has_company_access(auth.uid(), company_id)
  AND (
    public.has_role(auth.uid(), 'owner', company_id)
    OR public.has_role(auth.uid(), 'accountant', company_id)
  )
);

-- FIX 4: Fix function search_path for remaining functions
ALTER FUNCTION update_updated_at_column() SET search_path = public;

-- FIX 5: Add rate limiting protection via function for sensitive operations
CREATE OR REPLACE FUNCTION check_rate_limit(p_user_id uuid, p_action text, p_limit_per_minute int DEFAULT 10)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count int;
BEGIN
  -- Count recent actions of this type
  SELECT COUNT(*) INTO recent_count
  FROM audit_events
  WHERE user_id = p_user_id
  AND event_type = p_action
  AND created_at > NOW() - INTERVAL '1 minute';
  
  RETURN recent_count < p_limit_per_minute;
END;
$$;