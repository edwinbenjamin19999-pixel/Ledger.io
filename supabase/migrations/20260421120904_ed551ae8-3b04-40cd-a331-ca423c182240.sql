CREATE POLICY "Company admins can view member profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur_self
    JOIN public.user_roles ur_target
      ON ur_self.company_id = ur_target.company_id
    WHERE ur_self.user_id = auth.uid()
      AND ur_self.role = 'owner'
      AND ur_target.user_id = profiles.id
  )
);