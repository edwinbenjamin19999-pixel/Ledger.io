-- Fix: Restrict platform_admins INSERT to service_role only (prevent privilege escalation)
-- A compromised admin account should NOT be able to add new platform admins
DROP POLICY IF EXISTS "Platform admins can insert" ON platform_admins;

-- Only service_role (server-side) or postgres can insert new platform admins
CREATE POLICY "Only service role can insert platform admins" ON platform_admins
  FOR INSERT
  WITH CHECK (
    (current_setting('request.jwt.claims', true)::json->>'role') = 'service_role'
    OR current_setting('role', true) = 'postgres'
  );