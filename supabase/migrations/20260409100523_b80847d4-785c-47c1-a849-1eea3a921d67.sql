
-- Approval flows configuration
CREATE TABLE IF NOT EXISTS public.approval_flows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  module text NOT NULL,
  action_type text NOT NULL,
  conditions jsonb DEFAULT '{}'::jsonb,
  steps_count integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.approval_flows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view approval flows"
  ON public.approval_flows FOR SELECT TO authenticated
  USING (company_id IN (SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid()));

CREATE POLICY "Owners and admins can manage approval flows"
  ON public.approval_flows FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'owner'::app_role, company_id)
    OR public.has_role(auth.uid(), 'admin'::app_role, company_id)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'owner'::app_role, company_id)
    OR public.has_role(auth.uid(), 'admin'::app_role, company_id)
  );

-- Approval flow steps
CREATE TABLE IF NOT EXISTS public.approval_flow_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id uuid NOT NULL REFERENCES public.approval_flows(id) ON DELETE CASCADE,
  step_order integer NOT NULL,
  required_role app_role,
  can_be_any_of_roles app_role[] DEFAULT '{}',
  required_count integer NOT NULL DEFAULT 1,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(flow_id, step_order)
);

ALTER TABLE public.approval_flow_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view flow steps"
  ON public.approval_flow_steps FOR SELECT TO authenticated
  USING (
    flow_id IN (
      SELECT af.id FROM public.approval_flows af
      WHERE af.company_id IN (SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid())
    )
  );

CREATE POLICY "Owners and admins can manage flow steps"
  ON public.approval_flow_steps FOR ALL TO authenticated
  USING (
    flow_id IN (
      SELECT af.id FROM public.approval_flows af
      WHERE public.has_role(auth.uid(), 'owner'::app_role, af.company_id)
        OR public.has_role(auth.uid(), 'admin'::app_role, af.company_id)
    )
  )
  WITH CHECK (
    flow_id IN (
      SELECT af.id FROM public.approval_flows af
      WHERE public.has_role(auth.uid(), 'owner'::app_role, af.company_id)
        OR public.has_role(auth.uid(), 'admin'::app_role, af.company_id)
    )
  );

-- Approval requests
CREATE TABLE IF NOT EXISTS public.approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  flow_id uuid REFERENCES public.approval_flows(id),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  requested_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  current_step integer NOT NULL DEFAULT 1,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view approval requests"
  ON public.approval_requests FOR SELECT TO authenticated
  USING (company_id IN (SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid()));

CREATE POLICY "Users can create approval requests for their company"
  ON public.approval_requests FOR INSERT TO authenticated
  WITH CHECK (
    requested_by = auth.uid()
    AND company_id IN (SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid())
  );

CREATE POLICY "Approvers can update approval requests"
  ON public.approval_requests FOR UPDATE TO authenticated
  USING (company_id IN (SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid()));

-- Approval decisions
CREATE TABLE IF NOT EXISTS public.approval_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.approval_requests(id) ON DELETE CASCADE,
  step_order integer NOT NULL,
  decided_by uuid NOT NULL,
  decision text NOT NULL,
  comment text,
  decided_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.approval_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view approval decisions"
  ON public.approval_decisions FOR SELECT TO authenticated
  USING (
    request_id IN (
      SELECT ar.id FROM public.approval_requests ar
      WHERE ar.company_id IN (SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid())
    )
  );

CREATE POLICY "Approvers can insert decisions"
  ON public.approval_decisions FOR INSERT TO authenticated
  WITH CHECK (
    decided_by = auth.uid()
    AND request_id IN (
      SELECT ar.id FROM public.approval_requests ar
      WHERE ar.company_id IN (SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid())
    )
  );

-- Segregation of duties rules
CREATE TABLE IF NOT EXISTS public.segregation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  action_a text NOT NULL,
  action_b text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.segregation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view segregation rules"
  ON public.segregation_rules FOR SELECT TO authenticated
  USING (company_id IN (SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid()));

CREATE POLICY "Owners can manage segregation rules"
  ON public.segregation_rules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::app_role, company_id))
  WITH CHECK (public.has_role(auth.uid(), 'owner'::app_role, company_id));

-- Segregation check function
CREATE OR REPLACE FUNCTION public.check_segregation(
  p_company_id uuid,
  p_user_id uuid,
  p_action text,
  p_entity_id uuid
) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_conflicting_action text;
  v_has_conflict boolean := false;
BEGIN
  FOR v_conflicting_action IN
    SELECT CASE WHEN action_a = p_action THEN action_b ELSE action_a END
    FROM segregation_rules
    WHERE company_id = p_company_id
      AND is_active = true
      AND (action_a = p_action OR action_b = p_action)
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM approval_decisions ad
      JOIN approval_requests ar ON ar.id = ad.request_id
      WHERE ar.entity_id = p_entity_id
        AND ar.company_id = p_company_id
        AND ad.decided_by = p_user_id
        AND ar.metadata->>'action_type' = v_conflicting_action
    ) INTO v_has_conflict;
    
    IF v_has_conflict THEN
      RETURN false;
    END IF;
  END LOOP;
  
  RETURN true;
END;
$$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_approval_requests_company_status ON public.approval_requests(company_id, status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_entity ON public.approval_requests(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_approval_decisions_request ON public.approval_decisions(request_id);
CREATE INDEX IF NOT EXISTS idx_approval_flows_company ON public.approval_flows(company_id, is_active);
