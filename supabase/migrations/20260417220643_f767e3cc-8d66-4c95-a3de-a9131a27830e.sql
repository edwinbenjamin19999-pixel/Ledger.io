-- ============================================================
-- 1. Extend securities_accounts
-- ============================================================
ALTER TABLE public.securities_accounts
  ADD COLUMN IF NOT EXISTS legal_treatment text
    CHECK (legal_treatment IN ('balance_sheet','tax_only','insurance_wrapper'))
    DEFAULT 'balance_sheet';

-- ============================================================
-- 2. Extend securities_holdings
-- ============================================================
ALTER TABLE public.securities_holdings
  ADD COLUMN IF NOT EXISTS is_unlisted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_naringsbetingad boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS acquisition_date date,
  ADD COLUMN IF NOT EXISTS manual_valuation numeric,
  ADD COLUMN IF NOT EXISTS valuation_date date,
  ADD COLUMN IF NOT EXISTS ownership_percentage numeric;

-- ============================================================
-- 3. Create securities_statements
-- ============================================================
CREATE TABLE IF NOT EXISTS public.securities_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  securities_account_id uuid REFERENCES public.securities_accounts(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  statement_type text NOT NULL DEFAULT 'other'
    CHECK (statement_type IN ('annual','transaction','dividend','k4','other')),
  period_start date,
  period_end date,
  source text NOT NULL DEFAULT 'pdf'
    CHECK (source IN ('pdf','csv','sru','manual','api')),
  parse_status text NOT NULL DEFAULT 'pending'
    CHECK (parse_status IN ('pending','parsing','parsed','failed','reviewed')),
  parse_confidence numeric,
  parse_data jsonb,
  parse_error text,
  extracted_count integer DEFAULT 0,
  uploaded_by uuid,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  parsed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_securities_statements_company ON public.securities_statements(company_id);
CREATE INDEX IF NOT EXISTS idx_securities_statements_account ON public.securities_statements(securities_account_id);
CREATE INDEX IF NOT EXISTS idx_securities_statements_status ON public.securities_statements(parse_status);

ALTER TABLE public.securities_statements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members_select_statements" ON public.securities_statements
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.company_id = securities_statements.company_id)
  );
CREATE POLICY "members_insert_statements" ON public.securities_statements
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.company_id = securities_statements.company_id)
  );
CREATE POLICY "members_update_statements" ON public.securities_statements
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.company_id = securities_statements.company_id)
  );
CREATE POLICY "members_delete_statements" ON public.securities_statements
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.company_id = securities_statements.company_id)
  );

-- ============================================================
-- 4. Extend securities_transactions
-- ============================================================
ALTER TABLE public.securities_transactions
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'draft'
    CHECK (review_status IN ('draft','needs_review','reviewed','posted','rejected')),
  ADD COLUMN IF NOT EXISTS statement_id uuid REFERENCES public.securities_statements(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS classification_confidence numeric,
  ADD COLUMN IF NOT EXISTS ambiguity_notes text,
  ADD COLUMN IF NOT EXISTS duplicate_of_id uuid REFERENCES public.securities_transactions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_securities_tx_review_status ON public.securities_transactions(review_status);
CREATE INDEX IF NOT EXISTS idx_securities_tx_statement ON public.securities_transactions(statement_id);

-- ============================================================
-- 5. Create securities_classifications (audit)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.securities_classifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  transaction_id uuid REFERENCES public.securities_transactions(id) ON DELETE CASCADE,
  classified_by text NOT NULL DEFAULT 'ai' CHECK (classified_by IN ('ai','user','rule')),
  instrument_type text,
  tx_type_proposed text,
  tx_type_final text,
  account_type_proposed text,
  confidence numeric,
  ambiguity_flags jsonb,
  override_reason text,
  ai_model text,
  source_excerpt text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE INDEX IF NOT EXISTS idx_securities_class_tx ON public.securities_classifications(transaction_id);
CREATE INDEX IF NOT EXISTS idx_securities_class_company ON public.securities_classifications(company_id);

ALTER TABLE public.securities_classifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_select_class" ON public.securities_classifications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.company_id = securities_classifications.company_id)
  );
CREATE POLICY "members_insert_class" ON public.securities_classifications
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.company_id = securities_classifications.company_id)
  );
CREATE POLICY "members_update_class" ON public.securities_classifications
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.company_id = securities_classifications.company_id)
  );

-- ============================================================
-- 6. Create securities_documents (attachments to unlisted holdings)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.securities_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  holding_id uuid REFERENCES public.securities_holdings(id) ON DELETE CASCADE,
  document_type text NOT NULL DEFAULT 'other'
    CHECK (document_type IN ('contract','certificate','valuation','board','other')),
  storage_path text NOT NULL,
  file_name text NOT NULL,
  valuation_date date,
  valuation_amount numeric,
  notes text,
  uploaded_by uuid,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_securities_docs_holding ON public.securities_documents(holding_id);
CREATE INDEX IF NOT EXISTS idx_securities_docs_company ON public.securities_documents(company_id);

ALTER TABLE public.securities_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_select_docs" ON public.securities_documents
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.company_id = securities_documents.company_id)
  );
CREATE POLICY "members_insert_docs" ON public.securities_documents
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.company_id = securities_documents.company_id)
  );
CREATE POLICY "members_update_docs" ON public.securities_documents
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.company_id = securities_documents.company_id)
  );
CREATE POLICY "members_delete_docs" ON public.securities_documents
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.company_id = securities_documents.company_id)
  );

-- ============================================================
-- 7. Storage buckets
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
  VALUES ('securities-statements','securities-statements',false)
  ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
  VALUES ('securities-documents','securities-documents',false)
  ON CONFLICT (id) DO NOTHING;

-- Statement bucket policies (path prefix = company_id)
CREATE POLICY "members_select_statement_files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'securities-statements'
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.company_id::text = (storage.foldername(name))[1]
    )
  );
CREATE POLICY "members_insert_statement_files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'securities-statements'
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.company_id::text = (storage.foldername(name))[1]
    )
  );
CREATE POLICY "members_delete_statement_files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'securities-statements'
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.company_id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "members_select_doc_files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'securities-documents'
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.company_id::text = (storage.foldername(name))[1]
    )
  );
CREATE POLICY "members_insert_doc_files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'securities-documents'
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.company_id::text = (storage.foldername(name))[1]
    )
  );
CREATE POLICY "members_delete_doc_files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'securities-documents'
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.company_id::text = (storage.foldername(name))[1]
    )
  );