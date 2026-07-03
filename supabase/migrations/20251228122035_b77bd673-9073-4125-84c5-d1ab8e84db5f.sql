-- Fix employees RLS: Ensure roles are scoped to the specific company
DROP POLICY IF EXISTS "Owners and accountants can manage employees" ON public.employees;
DROP POLICY IF EXISTS "Owners and accountants can view all employee data" ON public.employees;
DROP POLICY IF EXISTS "Owners and accountants can view all employees" ON public.employees;

-- Recreate with proper company-scoped role checks
CREATE POLICY "Owners and accountants can view employees"
ON public.employees FOR SELECT
USING (
  has_company_access(auth.uid(), company_id) AND 
  (has_role(auth.uid(), 'owner'::app_role, company_id) OR has_role(auth.uid(), 'accountant'::app_role, company_id))
);

CREATE POLICY "Owners and accountants can insert employees"
ON public.employees FOR INSERT
WITH CHECK (
  has_company_access(auth.uid(), company_id) AND 
  (has_role(auth.uid(), 'owner'::app_role, company_id) OR has_role(auth.uid(), 'accountant'::app_role, company_id))
);

CREATE POLICY "Owners and accountants can update employees"
ON public.employees FOR UPDATE
USING (
  has_company_access(auth.uid(), company_id) AND 
  (has_role(auth.uid(), 'owner'::app_role, company_id) OR has_role(auth.uid(), 'accountant'::app_role, company_id))
);

CREATE POLICY "Owners can delete employees"
ON public.employees FOR DELETE
USING (
  has_company_access(auth.uid(), company_id) AND 
  has_role(auth.uid(), 'owner'::app_role, company_id)
);

-- Fix audit_events RLS: Remove NULL company_id access for regular users
DROP POLICY IF EXISTS "Users can view audit events for accessible companies" ON public.audit_events;
DROP POLICY IF EXISTS "Users can view audit events for their companies" ON public.audit_events;

-- Recreate with stricter access (only events for companies user has access to, OR their own events)
CREATE POLICY "Users can view their own audit events"
ON public.audit_events FOR SELECT
USING (
  user_id = auth.uid() OR 
  (company_id IS NOT NULL AND has_company_access(auth.uid(), company_id))
);