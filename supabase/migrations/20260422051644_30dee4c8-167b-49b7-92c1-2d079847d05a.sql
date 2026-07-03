CREATE TABLE IF NOT EXISTS public.bolagsverket_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  document_id text NOT NULL,
  document_type text NOT NULL DEFAULT 'annual_report',
  fiscal_year integer,
  period_end text,
  storage_path text NOT NULL,
  source text NOT NULL DEFAULT 'bolagsverket',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, document_id)
);

CREATE INDEX IF NOT EXISTS bolagsverket_documents_company_idx
  ON public.bolagsverket_documents (company_id, fiscal_year DESC);

ALTER TABLE public.bolagsverket_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view bolagsverket documents"
  ON public.bolagsverket_documents
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.company_id = bolagsverket_documents.company_id
  ));

CREATE POLICY "Owners can manage bolagsverket documents"
  ON public.bolagsverket_documents
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.company_id = bolagsverket_documents.company_id
      AND ur.role IN ('owner','admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.company_id = bolagsverket_documents.company_id
      AND ur.role IN ('owner','admin')
  ));