-- Helper to check if user has any role in the company
CREATE OR REPLACE FUNCTION public.has_company_access(_user_id uuid, _company_id uuid)
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

-- Helper to check edit access (admin/owner/cfo/accountant)
CREATE OR REPLACE FUNCTION public.has_company_edit_access(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin'::app_role, _company_id)
      OR public.has_role(_user_id, 'owner'::app_role, _company_id)
      OR public.has_role(_user_id, 'cfo'::app_role, _company_id)
      OR public.has_role(_user_id, 'accountant'::app_role, _company_id);
$$;

-- 1. ADJUSTMENTS
CREATE TABLE public.annual_report_adjustments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  annual_report_id UUID NOT NULL REFERENCES public.annual_reports(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  account_number TEXT NOT NULL,
  debit NUMERIC(18,2) NOT NULL DEFAULT 0,
  credit NUMERIC(18,2) NOT NULL DEFAULT 0,
  description TEXT,
  affected_areas JSONB NOT NULL DEFAULT '[]'::jsonb,
  source TEXT NOT NULL DEFAULT 'manual',
  ai_suggestion_id UUID NULL,
  confidence NUMERIC(3,2),
  is_reversed BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ar_adjustments_report ON public.annual_report_adjustments(annual_report_id);
CREATE INDEX idx_ar_adjustments_company ON public.annual_report_adjustments(company_id);

-- 2. AI SUGGESTIONS
CREATE TABLE public.annual_report_ai_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  annual_report_id UUID NOT NULL REFERENCES public.annual_reports(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  suggestion_type TEXT NOT NULL,
  title TEXT NOT NULL,
  explanation TEXT NOT NULL,
  impact_amount NUMERIC(18,2),
  affected_accounts JSONB NOT NULL DEFAULT '[]'::jsonb,
  proposed_adjustment JSONB,
  confidence NUMERIC(3,2) NOT NULL DEFAULT 0.5,
  severity TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending',
  source_refs JSONB NOT NULL DEFAULT '{}'::jsonb,
  model_version TEXT,
  applied_adjustment_id UUID NULL,
  dismissed_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ar_suggestions_report ON public.annual_report_ai_suggestions(annual_report_id);
CREATE INDEX idx_ar_suggestions_status ON public.annual_report_ai_suggestions(status);

-- 3. SECTIONS
CREATE TABLE public.annual_report_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  annual_report_id UUID NOT NULL REFERENCES public.annual_reports(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  parent_id UUID NULL REFERENCES public.annual_report_sections(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL,
  label TEXT NOT NULL,
  content TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  visible BOOLEAN NOT NULL DEFAULT true,
  ai_generated BOOLEAN NOT NULL DEFAULT false,
  locked BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ar_sections_report ON public.annual_report_sections(annual_report_id, order_index);
CREATE INDEX idx_ar_sections_parent ON public.annual_report_sections(parent_id);

-- 4. ATTACHMENTS
CREATE TABLE public.annual_report_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  annual_report_id UUID NOT NULL REFERENCES public.annual_reports(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  section_id UUID NULL REFERENCES public.annual_report_sections(id) ON DELETE SET NULL,
  account_number TEXT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'complete',
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ar_attachments_report ON public.annual_report_attachments(annual_report_id);

-- 5. COMMENTS
CREATE TABLE public.annual_report_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  annual_report_id UUID NOT NULL REFERENCES public.annual_reports(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  section_id UUID NULL REFERENCES public.annual_report_sections(id) ON DELETE CASCADE,
  parent_comment_id UUID NULL REFERENCES public.annual_report_comments(id) ON DELETE CASCADE,
  anchor_key TEXT,
  author_id UUID NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  mentions JSONB NOT NULL DEFAULT '[]'::jsonb,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ar_comments_report ON public.annual_report_comments(annual_report_id);
CREATE INDEX idx_ar_comments_section ON public.annual_report_comments(section_id);

-- 6. VERSIONS
CREATE TABLE public.annual_report_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  annual_report_id UUID NOT NULL REFERENCES public.annual_reports(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  label TEXT NOT NULL,
  snapshot JSONB NOT NULL,
  created_by UUID NOT NULL,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (annual_report_id, version_number)
);
CREATE INDEX idx_ar_versions_report ON public.annual_report_versions(annual_report_id, version_number DESC);

-- ENABLE RLS
ALTER TABLE public.annual_report_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annual_report_ai_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annual_report_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annual_report_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annual_report_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annual_report_versions ENABLE ROW LEVEL SECURITY;

-- POLICIES
CREATE POLICY "ar_adj_select" ON public.annual_report_adjustments FOR SELECT USING (public.has_company_access(auth.uid(), company_id));
CREATE POLICY "ar_adj_write" ON public.annual_report_adjustments FOR ALL
  USING (public.has_company_edit_access(auth.uid(), company_id))
  WITH CHECK (public.has_company_edit_access(auth.uid(), company_id));

CREATE POLICY "ar_sug_select" ON public.annual_report_ai_suggestions FOR SELECT USING (public.has_company_access(auth.uid(), company_id));
CREATE POLICY "ar_sug_write" ON public.annual_report_ai_suggestions FOR ALL
  USING (public.has_company_edit_access(auth.uid(), company_id))
  WITH CHECK (public.has_company_edit_access(auth.uid(), company_id));

CREATE POLICY "ar_sec_select" ON public.annual_report_sections FOR SELECT USING (public.has_company_access(auth.uid(), company_id));
CREATE POLICY "ar_sec_write" ON public.annual_report_sections FOR ALL
  USING (public.has_company_edit_access(auth.uid(), company_id))
  WITH CHECK (public.has_company_edit_access(auth.uid(), company_id));

CREATE POLICY "ar_att_select" ON public.annual_report_attachments FOR SELECT USING (public.has_company_access(auth.uid(), company_id));
CREATE POLICY "ar_att_write" ON public.annual_report_attachments FOR ALL
  USING (public.has_company_edit_access(auth.uid(), company_id))
  WITH CHECK (public.has_company_edit_access(auth.uid(), company_id));

CREATE POLICY "ar_com_select" ON public.annual_report_comments FOR SELECT USING (public.has_company_access(auth.uid(), company_id));
CREATE POLICY "ar_com_insert" ON public.annual_report_comments FOR INSERT
  WITH CHECK (author_id = auth.uid() AND public.has_company_access(auth.uid(), company_id));
CREATE POLICY "ar_com_update_own" ON public.annual_report_comments FOR UPDATE
  USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role, company_id));
CREATE POLICY "ar_com_delete_own" ON public.annual_report_comments FOR DELETE
  USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role, company_id));

CREATE POLICY "ar_ver_select" ON public.annual_report_versions FOR SELECT USING (public.has_company_access(auth.uid(), company_id));
CREATE POLICY "ar_ver_insert" ON public.annual_report_versions FOR INSERT
  WITH CHECK (created_by = auth.uid() AND public.has_company_edit_access(auth.uid(), company_id));

-- TRIGGERS
CREATE TRIGGER ar_adj_updated BEFORE UPDATE ON public.annual_report_adjustments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER ar_sug_updated BEFORE UPDATE ON public.annual_report_ai_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER ar_sec_updated BEFORE UPDATE ON public.annual_report_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER ar_com_updated BEFORE UPDATE ON public.annual_report_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- REALTIME
ALTER TABLE public.annual_report_adjustments REPLICA IDENTITY FULL;
ALTER TABLE public.annual_report_ai_suggestions REPLICA IDENTITY FULL;
ALTER TABLE public.annual_report_comments REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.annual_report_adjustments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.annual_report_ai_suggestions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.annual_report_comments;