
-- Auditor reviews
CREATE TABLE public.ar_audit_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  annual_report_id uuid NOT NULL REFERENCES public.annual_reports(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  auditor_firm text,
  auditor_name text,
  auditor_email text NOT NULL,
  auditor_phone text,
  share_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24),'hex'),
  status text NOT NULL DEFAULT 'draft', -- draft, sent, in_review, completed
  sent_at timestamptz,
  submitted_at timestamptz,
  audit_report_url text,
  audit_report_opinion text, -- unmodified, qualified, adverse, disclaimer
  audit_report_text text,
  completed_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ar_audit_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members manage audit reviews" ON public.ar_audit_reviews
  FOR ALL USING (public.has_company_access(auth.uid(), company_id))
  WITH CHECK (public.has_company_access(auth.uid(), company_id));

CREATE TABLE public.ar_audit_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.ar_audit_reviews(id) ON DELETE CASCADE,
  section_ref text NOT NULL,
  comment_text text NOT NULL,
  severity text NOT NULL DEFAULT 'info', -- info, request_change, critical
  author_name text,
  status text NOT NULL DEFAULT 'open', -- open, addressed, dismissed
  reply_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ar_audit_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members manage audit comments" ON public.ar_audit_comments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.ar_audit_reviews r
            WHERE r.id = review_id AND public.has_company_access(auth.uid(), r.company_id))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.ar_audit_reviews r
            WHERE r.id = review_id AND public.has_company_access(auth.uid(), r.company_id))
  );

-- Board members + approvals
CREATE TABLE public.ar_board_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL, -- chair, member, deputy, ceo
  email text NOT NULL,
  personal_number_encrypted text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ar_board_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members manage board" ON public.ar_board_members
  FOR ALL USING (public.has_company_access(auth.uid(), company_id))
  WITH CHECK (public.has_company_access(auth.uid(), company_id));

CREATE TABLE public.ar_board_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  annual_report_id uuid NOT NULL REFERENCES public.annual_reports(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  board_member_id uuid REFERENCES public.ar_board_members(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  role text NOT NULL,
  share_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24),'hex'),
  status text NOT NULL DEFAULT 'pending', -- pending, approved, objected
  decision_at timestamptz,
  objection_text text,
  reminded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ar_board_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members manage approvals" ON public.ar_board_approvals
  FOR ALL USING (public.has_company_access(auth.uid(), company_id))
  WITH CHECK (public.has_company_access(auth.uid(), company_id));

-- Signing
CREATE TABLE public.ar_signing_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  annual_report_id uuid NOT NULL REFERENCES public.annual_reports(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  mode text NOT NULL DEFAULT 'parallel', -- parallel, sequential
  status text NOT NULL DEFAULT 'pending', -- pending, in_progress, completed, cancelled
  signed_pdf_url text,
  fallback_uploaded boolean NOT NULL DEFAULT false,
  initiated_by uuid,
  initiated_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ar_signing_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members manage signing" ON public.ar_signing_sessions
  FOR ALL USING (public.has_company_access(auth.uid(), company_id))
  WITH CHECK (public.has_company_access(auth.uid(), company_id));

CREATE TABLE public.ar_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.ar_signing_sessions(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  role text NOT NULL,
  personal_number_masked text,
  share_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24),'hex'),
  status text NOT NULL DEFAULT 'pending', -- pending, signed, declined
  signed_at timestamptz,
  bankid_order_ref text,
  bankid_certificate text,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ar_signatures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company members view signatures" ON public.ar_signatures
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.ar_signing_sessions s
            WHERE s.id = session_id AND public.has_company_access(auth.uid(), s.company_id))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.ar_signing_sessions s
            WHERE s.id = session_id AND public.has_company_access(auth.uid(), s.company_id))
  );

-- Indexes
CREATE INDEX idx_ar_audit_reviews_report ON public.ar_audit_reviews(annual_report_id);
CREATE INDEX idx_ar_audit_comments_review ON public.ar_audit_comments(review_id);
CREATE INDEX idx_ar_board_approvals_report ON public.ar_board_approvals(annual_report_id);
CREATE INDEX idx_ar_signatures_session ON public.ar_signatures(session_id);
