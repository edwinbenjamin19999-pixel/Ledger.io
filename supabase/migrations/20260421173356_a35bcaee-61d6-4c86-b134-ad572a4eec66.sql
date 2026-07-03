CREATE TABLE IF NOT EXISTS public.saved_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  name text NOT NULL,
  icon text DEFAULT 'Star',
  scope text NOT NULL DEFAULT 'private' CHECK (scope IN ('private','team')),
  is_default boolean NOT NULL DEFAULT false,
  route text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  pinned boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_saved_views_company ON public.saved_views(company_id, route);
CREATE INDEX IF NOT EXISTS idx_saved_views_owner ON public.saved_views(owner_id);

ALTER TABLE public.saved_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_views_select" ON public.saved_views FOR SELECT
  USING (
    public.has_company_access(auth.uid(), company_id)
    AND (scope = 'team' OR owner_id = auth.uid())
  );
CREATE POLICY "saved_views_insert" ON public.saved_views FOR INSERT
  WITH CHECK (public.has_company_access(auth.uid(), company_id) AND owner_id = auth.uid());
CREATE POLICY "saved_views_update" ON public.saved_views FOR UPDATE
  USING (owner_id = auth.uid() AND public.has_company_access(auth.uid(), company_id));
CREATE POLICY "saved_views_delete" ON public.saved_views FOR DELETE
  USING (owner_id = auth.uid() AND public.has_company_access(auth.uid(), company_id));

CREATE TABLE IF NOT EXISTS public.view_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  route text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  opened_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_view_usage_user ON public.view_usage_log(user_id, opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_view_usage_company ON public.view_usage_log(company_id, route);

ALTER TABLE public.view_usage_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view_usage_select_own" ON public.view_usage_log FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "view_usage_insert_own" ON public.view_usage_log FOR INSERT
  WITH CHECK (user_id = auth.uid() AND public.has_company_access(auth.uid(), company_id));

CREATE TABLE IF NOT EXISTS public.collab_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_key text NOT NULL,
  parent_id uuid REFERENCES public.collab_comments(id) ON DELETE CASCADE,
  body text NOT NULL,
  mentions uuid[] DEFAULT '{}',
  author_id uuid NOT NULL,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_collab_entity ON public.collab_comments(company_id, entity_type, entity_key, created_at);

ALTER TABLE public.collab_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "collab_select" ON public.collab_comments FOR SELECT
  USING (public.has_company_access(auth.uid(), company_id));
CREATE POLICY "collab_insert" ON public.collab_comments FOR INSERT
  WITH CHECK (public.has_company_access(auth.uid(), company_id) AND author_id = auth.uid());
CREATE POLICY "collab_update_own" ON public.collab_comments FOR UPDATE
  USING (author_id = auth.uid());
CREATE POLICY "collab_delete_own" ON public.collab_comments FOR DELETE
  USING (author_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.collab_comments;

CREATE TABLE IF NOT EXISTS public.collab_explanations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entity_key text NOT NULL,
  explanation_text text NOT NULL,
  attached_amount_sek numeric,
  period text,
  author_id uuid NOT NULL,
  ai_generated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_collab_expl_entity ON public.collab_explanations(company_id, entity_key);

ALTER TABLE public.collab_explanations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "collab_expl_select" ON public.collab_explanations FOR SELECT
  USING (public.has_company_access(auth.uid(), company_id));
CREATE POLICY "collab_expl_insert" ON public.collab_explanations FOR INSERT
  WITH CHECK (public.has_company_access(auth.uid(), company_id) AND author_id = auth.uid());
CREATE POLICY "collab_expl_delete" ON public.collab_explanations FOR DELETE
  USING (author_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.view_dismissed_insights (
  user_id uuid NOT NULL,
  insight_key text NOT NULL,
  dismissed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, insight_key)
);
ALTER TABLE public.view_dismissed_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dismissed_own" ON public.view_dismissed_insights FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.tg_set_updated_at_financial_os()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS tg_saved_views_updated_at ON public.saved_views;
CREATE TRIGGER tg_saved_views_updated_at BEFORE UPDATE ON public.saved_views
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at_financial_os();
DROP TRIGGER IF EXISTS tg_collab_comments_updated_at ON public.collab_comments;
CREATE TRIGGER tg_collab_comments_updated_at BEFORE UPDATE ON public.collab_comments
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at_financial_os();