-- =====================================================
-- NorthLedger Database Schema - Complete ERP System
-- Version: 1.0
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. ENUMS & TYPES
-- =====================================================

-- User roles (separate from users for security)
CREATE TYPE public.app_role AS ENUM ('owner', 'cfo', 'accountant', 'auditor', 'limited_user');

-- Country codes
CREATE TYPE public.country_code AS ENUM ('SE', 'NO', 'DK', 'FI');

-- Document types
CREATE TYPE public.document_type AS ENUM ('invoice_incoming', 'invoice_outgoing', 'receipt', 'bank_statement', 'peppol', 'other');

-- Transaction status
CREATE TYPE public.transaction_status AS ENUM ('pending', 'matched', 'reconciled', 'unmatched');

-- Journal entry status
CREATE TYPE public.journal_status AS ENUM ('draft', 'pending_approval', 'approved', 'rejected', 'posted');

-- Invoice status
CREATE TYPE public.invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');

-- Consolidation elimination type
CREATE TYPE public.elimination_type AS ENUM ('intercompany_sales', 'intercompany_receivable', 'intercompany_payable', 'other');

-- =====================================================
-- 2. CORE TABLES
-- =====================================================

-- Profiles table (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User roles table (SECURITY: separate from profiles)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  company_id UUID, -- Will be linked after company table is created
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role, company_id)
);

-- Groups (koncern)
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'SEK',
  fiscal_year_start INTEGER NOT NULL DEFAULT 1, -- Month (1-12)
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Companies (juridiska enheter)
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
  org_number TEXT NOT NULL,
  name TEXT NOT NULL,
  country public.country_code NOT NULL DEFAULT 'SE',
  currency TEXT NOT NULL DEFAULT 'SEK',
  vat_number TEXT,
  address TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_number, country)
);

-- Add foreign key to user_roles after company table exists
ALTER TABLE public.user_roles 
  ADD CONSTRAINT fk_user_roles_company 
  FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

-- Chart of Accounts
CREATE TABLE public.chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL, -- asset, liability, equity, revenue, expense
  vat_code TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, account_number)
);

-- Documents (kvitton, fakturor, etc)
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  document_type public.document_type NOT NULL,
  file_url TEXT, -- Storage bucket URL
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  metadata JSONB, -- OCR results, PEPPOL data, etc
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Transactions (banktransaktioner)
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'SEK',
  description TEXT,
  counterparty TEXT,
  iban TEXT,
  reference TEXT,
  status public.transaction_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Journal Entries (verifikat)
CREATE TABLE public.journal_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  journal_number TEXT,
  entry_date DATE NOT NULL,
  description TEXT,
  status public.journal_status NOT NULL DEFAULT 'draft',
  ai_confidence DECIMAL(3,2), -- 0.00 - 1.00
  ai_explanation TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  approved_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Journal Entry Lines
CREATE TABLE public.journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journal_entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id),
  debit DECIMAL(15,2) DEFAULT 0,
  credit DECIMAL(15,2) DEFAULT 0,
  vat_code TEXT,
  vat_amount DECIMAL(15,2) DEFAULT 0,
  dimension TEXT, -- For cost centers, projects, etc
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Invoices (both AP and AR)
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  invoice_type TEXT NOT NULL, -- 'incoming' or 'outgoing'
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  counterparty_name TEXT NOT NULL,
  counterparty_org_number TEXT,
  total_amount DECIMAL(15,2) NOT NULL,
  vat_amount DECIMAL(15,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'SEK',
  status public.invoice_status NOT NULL DEFAULT 'draft',
  peppol_id TEXT, -- PEPPOL reference
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, invoice_number, invoice_type)
);

-- Invoice Lines
CREATE TABLE public.invoice_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(15,2) NOT NULL,
  vat_rate DECIMAL(5,2) NOT NULL,
  vat_amount DECIMAL(15,2) NOT NULL,
  total_amount DECIMAL(15,2) NOT NULL,
  account_id UUID REFERENCES public.chart_of_accounts(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Consolidation Eliminations
CREATE TABLE public.eliminations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  elimination_type public.elimination_type NOT NULL,
  company_a_id UUID NOT NULL REFERENCES public.companies(id),
  company_b_id UUID NOT NULL REFERENCES public.companies(id),
  amount DECIMAL(15,2) NOT NULL,
  currency TEXT NOT NULL,
  exchange_rate DECIMAL(10,6) DEFAULT 1.0,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit Events (oföränderlig logg)
CREATE TABLE public.audit_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  company_id UUID REFERENCES public.companies(id),
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 3. INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_company_id ON public.user_roles(company_id);
CREATE INDEX idx_companies_group_id ON public.companies(group_id);
CREATE INDEX idx_documents_company_id ON public.documents(company_id);
CREATE INDEX idx_transactions_company_id ON public.transactions(company_id);
CREATE INDEX idx_transactions_date ON public.transactions(transaction_date);
CREATE INDEX idx_journal_entries_company_id ON public.journal_entries(company_id);
CREATE INDEX idx_journal_entries_status ON public.journal_entries(status);
CREATE INDEX idx_journal_entry_lines_journal_id ON public.journal_entry_lines(journal_entry_id);
CREATE INDEX idx_invoices_company_id ON public.invoices(company_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_audit_events_entity ON public.audit_events(entity_type, entity_id);
CREATE INDEX idx_audit_events_user ON public.audit_events(user_id);

-- =====================================================
-- 4. TRIGGERS & FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON public.groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_chart_of_accounts_updated_at BEFORE UPDATE ON public.chart_of_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_journal_entries_updated_at BEFORE UPDATE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_eliminations_updated_at BEFORE UPDATE ON public.eliminations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to check user role (for RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role, _company_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (company_id = _company_id OR company_id IS NULL OR _company_id IS NULL)
  )
$$;

-- Function to check company access
CREATE OR REPLACE FUNCTION public.has_company_access(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND company_id = _company_id
  )
$$;

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eliminations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- User roles policies
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owners can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'owner'));

-- Groups policies
CREATE POLICY "Users can view groups they have access to" ON public.groups FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.companies c
    JOIN public.user_roles ur ON ur.company_id = c.id
    WHERE c.group_id = groups.id AND ur.user_id = auth.uid()
  )
);
CREATE POLICY "Owners can manage groups" ON public.groups FOR ALL USING (public.has_role(auth.uid(), 'owner'));

-- Companies policies
CREATE POLICY "Users can view companies they have access to" ON public.companies FOR SELECT USING (
  public.has_company_access(auth.uid(), id)
);
CREATE POLICY "Owners can insert companies" ON public.companies FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Owners can update companies" ON public.companies FOR UPDATE USING (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "Owners can delete companies" ON public.companies FOR DELETE USING (public.has_role(auth.uid(), 'owner'));

-- Chart of accounts policies
CREATE POLICY "Users can view COA for accessible companies" ON public.chart_of_accounts FOR SELECT USING (
  public.has_company_access(auth.uid(), company_id)
);
CREATE POLICY "Owners and accountants can manage COA" ON public.chart_of_accounts FOR ALL USING (
  public.has_company_access(auth.uid(), company_id) AND 
  (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'accountant'))
);

-- Documents policies
CREATE POLICY "Users can view documents for accessible companies" ON public.documents FOR SELECT USING (
  public.has_company_access(auth.uid(), company_id)
);
CREATE POLICY "Users can insert documents" ON public.documents FOR INSERT WITH CHECK (
  public.has_company_access(auth.uid(), company_id)
);

-- Transactions policies
CREATE POLICY "Users can view transactions for accessible companies" ON public.transactions FOR SELECT USING (
  public.has_company_access(auth.uid(), company_id)
);
CREATE POLICY "Accountants can manage transactions" ON public.transactions FOR ALL USING (
  public.has_company_access(auth.uid(), company_id) AND
  (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'accountant'))
);

-- Journal entries policies
CREATE POLICY "Users can view journal entries for accessible companies" ON public.journal_entries FOR SELECT USING (
  public.has_company_access(auth.uid(), company_id)
);
CREATE POLICY "Accountants can manage journal entries" ON public.journal_entries FOR ALL USING (
  public.has_company_access(auth.uid(), company_id) AND
  (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'accountant'))
);

-- Journal entry lines policies (inherit from parent)
CREATE POLICY "Users can view journal entry lines" ON public.journal_entry_lines FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.journal_entries je
    WHERE je.id = journal_entry_lines.journal_entry_id
    AND public.has_company_access(auth.uid(), je.company_id)
  )
);
CREATE POLICY "Accountants can manage journal entry lines" ON public.journal_entry_lines FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.journal_entries je
    WHERE je.id = journal_entry_lines.journal_entry_id
    AND public.has_company_access(auth.uid(), je.company_id)
    AND (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'accountant'))
  )
);

-- Invoices policies
CREATE POLICY "Users can view invoices for accessible companies" ON public.invoices FOR SELECT USING (
  public.has_company_access(auth.uid(), company_id)
);
CREATE POLICY "Users can manage invoices" ON public.invoices FOR ALL USING (
  public.has_company_access(auth.uid(), company_id)
);

-- Invoice lines policies
CREATE POLICY "Users can view invoice lines" ON public.invoice_lines FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_lines.invoice_id
    AND public.has_company_access(auth.uid(), i.company_id)
  )
);
CREATE POLICY "Users can manage invoice lines" ON public.invoice_lines FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_lines.invoice_id
    AND public.has_company_access(auth.uid(), i.company_id)
  )
);

-- Eliminations policies
CREATE POLICY "Users can view eliminations for accessible groups" ON public.eliminations FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.companies c
    JOIN public.user_roles ur ON ur.company_id = c.id
    WHERE c.group_id = eliminations.group_id AND ur.user_id = auth.uid()
  )
);
CREATE POLICY "CFO and owners can manage eliminations" ON public.eliminations FOR ALL USING (
  public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'cfo')
);

-- Audit events policies (read-only for most, append for all)
CREATE POLICY "Users can view audit events for accessible companies" ON public.audit_events FOR SELECT USING (
  company_id IS NULL OR public.has_company_access(auth.uid(), company_id)
);
CREATE POLICY "System can insert audit events" ON public.audit_events FOR INSERT WITH CHECK (true);

-- =====================================================
-- 6. STORAGE BUCKETS
-- =====================================================

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for documents
CREATE POLICY "Users can view documents in accessible companies"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.file_url LIKE '%' || storage.objects.name
    AND public.has_company_access(auth.uid(), d.company_id)
  )
);

CREATE POLICY "Users can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'documents' AND auth.uid() IS NOT NULL);

-- =====================================================
-- 7. SEED DATA (BAS 2025 kontoplan för svenska bolag)
-- =====================================================

-- This will be populated when a company is created
-- For now, we leave it empty