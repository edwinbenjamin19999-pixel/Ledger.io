
-- Fix 3: Remove journal tables from Realtime publication
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'journal_entries') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.journal_entries;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'journal_entry_lines') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.journal_entry_lines;
  END IF;
END $$;

-- Fix 6: Scope user_error_tracking to own errors or platform admin
DROP POLICY IF EXISTS "Owners can view all errors" ON user_error_tracking;
DROP POLICY IF EXISTS "Users can view their own errors" ON user_error_tracking;
DROP POLICY IF EXISTS "Users can view own errors or platform admins all" ON user_error_tracking;

CREATE POLICY "Users can view own errors or platform admins all" ON user_error_tracking FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR is_platform_admin(auth.uid())
);

-- Fix 7: Tighten user_roles owner management policy
DROP POLICY IF EXISTS "Owners can manage roles" ON user_roles;
DROP POLICY IF EXISTS "Owners can manage company roles" ON user_roles;
CREATE POLICY "Owners can manage company roles" ON user_roles FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'owner'::app_role, company_id)
)
WITH CHECK (
  has_role(auth.uid(), 'owner'::app_role, company_id)
  AND company_id IS NOT NULL
);
