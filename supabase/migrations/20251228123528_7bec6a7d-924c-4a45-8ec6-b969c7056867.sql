
-- =====================================================
-- 1. USER INVITATIONS TABLE
-- =====================================================
CREATE TABLE public.user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'accountant',
  invited_by UUID NOT NULL REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, email, status)
);

-- Enable RLS
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- Owners can manage invitations for their companies
CREATE POLICY "Owners can manage invitations"
  ON public.user_invitations FOR ALL
  USING (
    has_company_access(auth.uid(), company_id) AND 
    has_role(auth.uid(), 'owner'::app_role, company_id)
  );

-- Anyone can view their own invitation by token (for accepting)
CREATE POLICY "Users can view invitations sent to their email"
  ON public.user_invitations FOR SELECT
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- =====================================================
-- 2. MODULE PERMISSIONS SYSTEM
-- =====================================================

-- Define available modules
CREATE TYPE public.app_module AS ENUM (
  'invoices',
  'bookkeeping', 
  'payroll',
  'bank',
  'reports',
  'tax',
  'employees',
  'settings',
  'consolidation'
);

-- Define permission levels
CREATE TYPE public.permission_level AS ENUM (
  'none',
  'view',
  'create',
  'edit',
  'approve',
  'full'
);

-- User module permissions table
CREATE TABLE public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  module app_module NOT NULL,
  permission permission_level NOT NULL DEFAULT 'view',
  granted_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, company_id, module)
);

-- Enable RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Users can view their own permissions
CREATE POLICY "Users can view own permissions"
  ON public.user_permissions FOR SELECT
  USING (user_id = auth.uid());

-- Owners can manage all permissions for their companies
CREATE POLICY "Owners can manage permissions"
  ON public.user_permissions FOR ALL
  USING (
    has_company_access(auth.uid(), company_id) AND 
    has_role(auth.uid(), 'owner'::app_role, company_id)
  );

-- =====================================================
-- 3. ACCESS REQUESTS (for approval flow)
-- =====================================================
CREATE TABLE public.access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  requested_role app_role NOT NULL DEFAULT 'accountant',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  message TEXT,
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, company_id, status)
);

-- Enable RLS
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

-- Users can view and create their own requests
CREATE POLICY "Users can manage own access requests"
  ON public.access_requests FOR ALL
  USING (user_id = auth.uid());

-- Owners can view and manage all requests for their companies
CREATE POLICY "Owners can manage access requests"
  ON public.access_requests FOR ALL
  USING (
    has_company_access(auth.uid(), company_id) AND 
    has_role(auth.uid(), 'owner'::app_role, company_id)
  );

-- =====================================================
-- 4. HELPER FUNCTIONS
-- =====================================================

-- Check if user has specific module permission
CREATE OR REPLACE FUNCTION public.has_module_permission(
  _user_id UUID, 
  _company_id UUID, 
  _module app_module, 
  _required_level permission_level
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND company_id = _company_id AND role = 'owner'
  )
  OR EXISTS (
    SELECT 1 FROM public.user_permissions
    WHERE user_id = _user_id 
      AND company_id = _company_id 
      AND module = _module
      AND (
        permission = 'full' OR
        (permission = 'approve' AND _required_level IN ('approve', 'edit', 'create', 'view')) OR
        (permission = 'edit' AND _required_level IN ('edit', 'create', 'view')) OR
        (permission = 'create' AND _required_level IN ('create', 'view')) OR
        (permission = 'view' AND _required_level = 'view')
      )
  )
$$;

-- Function to set default permissions based on role
CREATE OR REPLACE FUNCTION public.set_default_permissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mod app_module;
  perm permission_level;
BEGIN
  -- Set permissions based on role
  FOR mod IN SELECT unnest(enum_range(NULL::app_module)) LOOP
    -- Determine permission level based on role
    CASE NEW.role
      WHEN 'owner' THEN
        perm := 'full';
      WHEN 'cfo' THEN
        perm := CASE mod
          WHEN 'settings' THEN 'view'
          ELSE 'full'
        END;
      WHEN 'accountant' THEN
        perm := CASE mod
          WHEN 'settings' THEN 'none'
          WHEN 'employees' THEN 'view'
          ELSE 'edit'
        END;
      WHEN 'auditor' THEN
        perm := CASE mod
          WHEN 'settings' THEN 'none'
          WHEN 'employees' THEN 'none'
          ELSE 'view'
        END;
      ELSE
        perm := 'view';
    END CASE;
    
    -- Insert permission (ignore if exists)
    INSERT INTO public.user_permissions (user_id, company_id, module, permission, granted_by)
    VALUES (NEW.user_id, NEW.company_id, mod, perm, NEW.user_id)
    ON CONFLICT (user_id, company_id, module) DO NOTHING;
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Trigger to auto-create permissions when role is assigned
CREATE TRIGGER on_user_role_created
  AFTER INSERT ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_default_permissions();

-- =====================================================
-- 5. INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX idx_user_invitations_email ON public.user_invitations(email);
CREATE INDEX idx_user_invitations_token ON public.user_invitations(token);
CREATE INDEX idx_user_invitations_company ON public.user_invitations(company_id);
CREATE INDEX idx_user_permissions_user_company ON public.user_permissions(user_id, company_id);
CREATE INDEX idx_access_requests_company ON public.access_requests(company_id);
CREATE INDEX idx_access_requests_status ON public.access_requests(status);
