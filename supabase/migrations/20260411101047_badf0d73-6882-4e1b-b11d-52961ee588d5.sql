-- Add AI analysis columns to existing documents table
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS extracted_data jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_document_type text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_confidence numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS linked_entity_type text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS linked_entity_id uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS analyzed_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS contract_expiry_date date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS contract_notice_period text DEFAULT NULL;

-- Create index for contract expiry alerting
CREATE INDEX IF NOT EXISTS idx_documents_contract_expiry 
  ON public.documents (contract_expiry_date) 
  WHERE contract_expiry_date IS NOT NULL;

-- Create index for linked entity lookup
CREATE INDEX IF NOT EXISTS idx_documents_linked_entity 
  ON public.documents (linked_entity_type, linked_entity_id) 
  WHERE linked_entity_id IS NOT NULL;

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Authenticated users can view documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documents');

CREATE POLICY "Authenticated users can delete own documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'documents');