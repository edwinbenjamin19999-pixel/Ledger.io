CREATE POLICY "Platform admins can read waitlist"
ON public.waitlist
FOR SELECT
TO authenticated
USING (public.is_platform_admin(auth.uid()));