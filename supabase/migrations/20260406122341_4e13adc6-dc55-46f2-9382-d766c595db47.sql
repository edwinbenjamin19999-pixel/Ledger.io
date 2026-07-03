-- Fix 1: Tighten has_role() to not grant cross-company access when company_id is NULL
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role, _company_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (
        -- When a specific company_id is provided, match exactly
        (_company_id IS NOT NULL AND company_id = _company_id)
        OR
        -- When no company_id is provided, match any non-null company role
        (_company_id IS NULL AND company_id IS NOT NULL)
      )
  )
$$;

-- Fix 2: Tighten eliminations policy to scope by group membership
DROP POLICY IF EXISTS "CFO and owners can manage eliminations" ON eliminations;

CREATE POLICY "CFO and owners can manage eliminations" ON eliminations
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM companies c
    JOIN user_roles ur ON ur.company_id = c.id
    WHERE c.group_id = eliminations.group_id
      AND ur.user_id = auth.uid()
      AND ur.role IN ('owner', 'cfo')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM companies c
    JOIN user_roles ur ON ur.company_id = c.id
    WHERE c.group_id = eliminations.group_id
      AND ur.user_id = auth.uid()
      AND ur.role IN ('owner', 'cfo')
  )
);