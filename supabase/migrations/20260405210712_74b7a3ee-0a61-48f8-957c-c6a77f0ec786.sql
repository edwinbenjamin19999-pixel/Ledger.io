CREATE TABLE public.incoming_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  from_email text NOT NULL,
  from_name text,
  subject text,
  body_text text,
  body_html text,
  attachments jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'new',
  processed_at timestamptz,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  document_ids uuid[] DEFAULT '{}',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.incoming_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view incoming emails for their companies"
ON public.incoming_emails FOR SELECT TO authenticated
USING (
  company_id IN (
    SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update incoming emails for their companies"
ON public.incoming_emails FOR UPDATE TO authenticated
USING (
  company_id IN (
    SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid()
  )
)
WITH CHECK (
  company_id IN (
    SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid()
  )
);

CREATE INDEX idx_incoming_emails_company_status ON public.incoming_emails(company_id, status);
CREATE INDEX idx_incoming_emails_created_at ON public.incoming_emails(created_at DESC);