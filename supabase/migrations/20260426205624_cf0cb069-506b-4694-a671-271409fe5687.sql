CREATE OR REPLACE FUNCTION public.is_firm_member_for_company(_company_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.firm_clients fc
    JOIN public.firm_members fm ON fm.firm_id = fc.firm_id
    WHERE fc.company_id = _company_id
      AND fm.user_id = auth.uid()
      AND fc.is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_company_member(_company_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = _company_id AND c.created_by = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.company_id = _company_id AND ur.user_id = auth.uid()
  );
$$;

CREATE TABLE public.bureau_client_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.accounting_firms(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text,
  content text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  is_pinned boolean NOT NULL DEFAULT false,
  edited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_bureau_notes_company ON public.bureau_client_notes(company_id);
ALTER TABLE public.bureau_client_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Firm members read notes" ON public.bureau_client_notes FOR SELECT
  USING (public.is_firm_member_for_company(company_id));
CREATE POLICY "Firm members insert notes" ON public.bureau_client_notes FOR INSERT
  WITH CHECK (public.is_firm_member_for_company(company_id) AND author_id = auth.uid());
CREATE POLICY "Firm members update notes" ON public.bureau_client_notes FOR UPDATE
  USING (public.is_firm_member_for_company(company_id));
CREATE POLICY "Firm members delete notes" ON public.bureau_client_notes FOR DELETE
  USING (public.is_firm_member_for_company(company_id));

CREATE TABLE public.portal_action_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.accounting_firms(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('upload_receipt','sign_document','approve_payroll','answer_question','provide_info','other')),
  title text NOT NULL,
  description text,
  deadline date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','cancelled')),
  response_data jsonb DEFAULT '{}'::jsonb,
  completed_at timestamptz,
  completed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_portal_actions_company ON public.portal_action_items(company_id, status);
ALTER TABLE public.portal_action_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Firm or client read action items" ON public.portal_action_items FOR SELECT
  USING (public.is_firm_member_for_company(company_id) OR public.is_company_member(company_id));
CREATE POLICY "Firm creates action items" ON public.portal_action_items FOR INSERT
  WITH CHECK (public.is_firm_member_for_company(company_id));
CREATE POLICY "Firm or client updates action items" ON public.portal_action_items FOR UPDATE
  USING (public.is_firm_member_for_company(company_id) OR public.is_company_member(company_id));
CREATE POLICY "Firm deletes action items" ON public.portal_action_items FOR DELETE
  USING (public.is_firm_member_for_company(company_id));

CREATE TABLE public.portal_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL REFERENCES public.accounting_firms(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  sender_side text NOT NULL CHECK (sender_side IN ('bureau','client','system')),
  sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  body text NOT NULL DEFAULT '',
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_portal_messages_company ON public.portal_messages(company_id, created_at DESC);
ALTER TABLE public.portal_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Firm or client read messages" ON public.portal_messages FOR SELECT
  USING (public.is_firm_member_for_company(company_id) OR public.is_company_member(company_id));
CREATE POLICY "Firm or client insert messages" ON public.portal_messages FOR INSERT
  WITH CHECK (
    (sender_side = 'bureau' AND public.is_firm_member_for_company(company_id) AND sender_id = auth.uid())
    OR (sender_side = 'client' AND public.is_company_member(company_id) AND sender_id = auth.uid())
    OR (sender_side = 'system' AND public.is_firm_member_for_company(company_id))
  );

CREATE TRIGGER set_bureau_notes_updated BEFORE UPDATE ON public.bureau_client_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_portal_actions_updated BEFORE UPDATE ON public.portal_action_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();