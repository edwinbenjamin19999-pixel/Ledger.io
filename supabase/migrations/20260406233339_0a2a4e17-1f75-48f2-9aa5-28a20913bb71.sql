CREATE POLICY "Creators can manage their own groups"
ON public.groups
FOR ALL
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());