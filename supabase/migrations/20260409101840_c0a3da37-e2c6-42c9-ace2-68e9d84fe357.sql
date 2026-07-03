
-- Helper function to check any company membership
CREATE OR REPLACE FUNCTION public.has_company_membership(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND company_id = _company_id
  );
$$;

-- Comments on any entity
CREATE TABLE public.collaboration_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  parent_comment_id UUID REFERENCES public.collaboration_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.collaboration_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view comments" ON public.collaboration_comments
  FOR SELECT TO authenticated
  USING (public.has_company_membership(auth.uid(), company_id));

CREATE POLICY "Members can create comments" ON public.collaboration_comments
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.has_company_membership(auth.uid(), company_id));

CREATE POLICY "Users can update own comments" ON public.collaboration_comments
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can delete own comments" ON public.collaboration_comments
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX idx_collab_comments_entity ON public.collaboration_comments(entity_type, entity_id);
CREATE INDEX idx_collab_comments_company ON public.collaboration_comments(company_id);

-- Tasks
CREATE TABLE public.collaboration_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  entity_type TEXT,
  entity_id UUID,
  assigned_to UUID,
  assigned_by UUID NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'todo',
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.collaboration_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view tasks" ON public.collaboration_tasks
  FOR SELECT TO authenticated
  USING (public.has_company_membership(auth.uid(), company_id));

CREATE POLICY "Members can create tasks" ON public.collaboration_tasks
  FOR INSERT TO authenticated
  WITH CHECK (assigned_by = auth.uid() AND public.has_company_membership(auth.uid(), company_id));

CREATE POLICY "Assignee or creator can update tasks" ON public.collaboration_tasks
  FOR UPDATE TO authenticated
  USING (assigned_to = auth.uid() OR assigned_by = auth.uid());

CREATE POLICY "Creator can delete tasks" ON public.collaboration_tasks
  FOR DELETE TO authenticated USING (assigned_by = auth.uid());

CREATE INDEX idx_collab_tasks_company ON public.collaboration_tasks(company_id);
CREATE INDEX idx_collab_tasks_assigned ON public.collaboration_tasks(assigned_to);
CREATE INDEX idx_collab_tasks_status ON public.collaboration_tasks(status);

-- Mentions
CREATE TABLE public.collaboration_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.collaboration_comments(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.collaboration_tasks(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL,
  mentioned_by UUID NOT NULL,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.collaboration_mentions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see own mentions" ON public.collaboration_mentions
  FOR SELECT TO authenticated
  USING (mentioned_user_id = auth.uid() OR mentioned_by = auth.uid());

CREATE POLICY "Members can create mentions" ON public.collaboration_mentions
  FOR INSERT TO authenticated
  WITH CHECK (mentioned_by = auth.uid() AND public.has_company_membership(auth.uid(), company_id));

CREATE POLICY "Users can mark own mentions read" ON public.collaboration_mentions
  FOR UPDATE TO authenticated USING (mentioned_user_id = auth.uid());

CREATE INDEX idx_collab_mentions_user ON public.collaboration_mentions(mentioned_user_id);

-- Activity feed
CREATE TABLE public.collaboration_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.collaboration_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view activity" ON public.collaboration_activity
  FOR SELECT TO authenticated
  USING (public.has_company_membership(auth.uid(), company_id));

CREATE POLICY "Members can log activity" ON public.collaboration_activity
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.has_company_membership(auth.uid(), company_id));

CREATE INDEX idx_collab_activity_company ON public.collaboration_activity(company_id, created_at DESC);
