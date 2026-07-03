
-- Platform admins table - only for internal NorthLedger team
CREATE TABLE public.platform_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- Security definer function to check platform admin
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins WHERE user_id = _user_id
  )
$$;

-- Only existing platform admins can view
CREATE POLICY "Platform admins can view"
  ON public.platform_admins FOR SELECT
  USING (public.is_platform_admin(auth.uid()));

-- Only existing platform admins can insert new admins
CREATE POLICY "Platform admins can insert"
  ON public.platform_admins FOR INSERT
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- Only existing platform admins can delete
CREATE POLICY "Platform admins can delete"
  ON public.platform_admins FOR DELETE
  USING (public.is_platform_admin(auth.uid()));
