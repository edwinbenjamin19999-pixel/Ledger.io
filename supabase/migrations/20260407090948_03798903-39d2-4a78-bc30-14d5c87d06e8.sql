
-- Accounting firms table
CREATE TABLE public.accounting_firms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  org_number TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  logo_url TEXT,
  website TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Firm members (consultants belonging to a firm)
CREATE TABLE public.firm_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID REFERENCES public.accounting_firms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'consultant' CHECK (role IN ('admin', 'consultant', 'viewer')),
  title TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(firm_id, user_id)
);

-- Firm clients (companies managed by a firm)
CREATE TABLE public.firm_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID REFERENCES public.accounting_firms(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  assigned_consultant_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  mandate_type TEXT CHECK (mandate_type IN ('full', 'bookkeeping', 'payroll', 'tax', 'annual_report')),
  mandate_signed_at TIMESTAMPTZ,
  mandate_valid_until TIMESTAMPTZ,
  mandate_status TEXT NOT NULL DEFAULT 'pending' CHECK (mandate_status IN ('pending', 'active', 'expired', 'revoked')),
  invitation_token TEXT,
  invitation_sent_at TIMESTAMPTZ,
  invitation_accepted_at TIMESTAMPTZ,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(firm_id, company_id)
);

-- Firm tasks (task management per client)
CREATE TABLE public.firm_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID REFERENCES public.accounting_firms(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT CHECK (task_type IN ('bookkeeping', 'vat', 'agi', 'payroll', 'annual_report', 'tax_return', 'reconciliation', 'other')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done')),
  due_date DATE,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.accounting_firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.firm_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.firm_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.firm_tasks ENABLE ROW LEVEL SECURITY;

-- Helper function: check if user is a member of a firm
CREATE OR REPLACE FUNCTION public.is_firm_member(_user_id UUID, _firm_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.firm_members
    WHERE user_id = _user_id AND firm_id = _firm_id AND is_active = true
  );
$$;

-- Helper function: check if user is firm admin
CREATE OR REPLACE FUNCTION public.is_firm_admin(_user_id UUID, _firm_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.firm_members
    WHERE user_id = _user_id AND firm_id = _firm_id AND role = 'admin' AND is_active = true
  );
$$;

-- RLS: accounting_firms
CREATE POLICY "Firm members can view their firm"
  ON public.accounting_firms FOR SELECT TO authenticated
  USING (public.is_firm_member(auth.uid(), id));

CREATE POLICY "Firm admins can update their firm"
  ON public.accounting_firms FOR UPDATE TO authenticated
  USING (public.is_firm_admin(auth.uid(), id));

CREATE POLICY "Authenticated users can create firms"
  ON public.accounting_firms FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- RLS: firm_members
CREATE POLICY "Firm members can view members"
  ON public.firm_members FOR SELECT TO authenticated
  USING (public.is_firm_member(auth.uid(), firm_id));

CREATE POLICY "Firm admins can manage members"
  ON public.firm_members FOR INSERT TO authenticated
  WITH CHECK (public.is_firm_admin(auth.uid(), firm_id));

CREATE POLICY "Firm admins can update members"
  ON public.firm_members FOR UPDATE TO authenticated
  USING (public.is_firm_admin(auth.uid(), firm_id));

CREATE POLICY "Firm admins can delete members"
  ON public.firm_members FOR DELETE TO authenticated
  USING (public.is_firm_admin(auth.uid(), firm_id));

-- Special: allow creator to insert themselves as first member
CREATE POLICY "Creator can add themselves"
  ON public.firm_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS: firm_clients
CREATE POLICY "Firm members can view clients"
  ON public.firm_clients FOR SELECT TO authenticated
  USING (public.is_firm_member(auth.uid(), firm_id));

CREATE POLICY "Firm admins can manage clients"
  ON public.firm_clients FOR INSERT TO authenticated
  WITH CHECK (public.is_firm_member(auth.uid(), firm_id));

CREATE POLICY "Firm members can update clients"
  ON public.firm_clients FOR UPDATE TO authenticated
  USING (public.is_firm_member(auth.uid(), firm_id));

-- RLS: firm_tasks
CREATE POLICY "Firm members can view tasks"
  ON public.firm_tasks FOR SELECT TO authenticated
  USING (public.is_firm_member(auth.uid(), firm_id));

CREATE POLICY "Firm members can create tasks"
  ON public.firm_tasks FOR INSERT TO authenticated
  WITH CHECK (public.is_firm_member(auth.uid(), firm_id));

CREATE POLICY "Firm members can update tasks"
  ON public.firm_tasks FOR UPDATE TO authenticated
  USING (public.is_firm_member(auth.uid(), firm_id));

CREATE POLICY "Firm members can delete tasks"
  ON public.firm_tasks FOR DELETE TO authenticated
  USING (public.is_firm_member(auth.uid(), firm_id));
