-- Fix: Allow authenticated users to INSERT new groups
CREATE POLICY "Authenticated users can create groups"
ON public.groups
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

-- Fix: Allow INSERT on group_structure for group owners
CREATE POLICY "Users can insert group structure"
ON public.group_structure
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = group_structure.group_id
    AND g.created_by = auth.uid()
  )
);

-- Fix: Allow INSERT on consolidation_periods for group owners
CREATE POLICY "Users can insert consolidation periods"
ON public.consolidation_periods
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = consolidation_periods.group_id
    AND g.created_by = auth.uid()
  )
);