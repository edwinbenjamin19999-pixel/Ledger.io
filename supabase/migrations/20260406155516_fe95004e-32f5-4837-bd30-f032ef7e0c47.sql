
-- Payment proposals table
CREATE TABLE public.payment_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payment_date DATE NOT NULL,
  pay_immediately BOOLEAN DEFAULT false,
  reference_type TEXT DEFAULT 'ocr' CHECK (reference_type IN ('ocr', 'invoice_number')),
  approval_level TEXT DEFAULT '2-eye' CHECK (approval_level IN ('2-eye', '4-eye')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved_1', 'approved', 'rejected', 'sent_to_bank', 'downloaded', 'completed')),
  total_amount NUMERIC NOT NULL DEFAULT 0,
  invoice_count INTEGER NOT NULL DEFAULT 0,
  pain001_xml TEXT,
  pain001_filename TEXT,
  rejection_comment TEXT,
  approver_1_id UUID,
  approver_1_at TIMESTAMPTZ,
  approver_2_id UUID,
  approver_2_at TIMESTAMPTZ,
  journal_entry_id UUID REFERENCES public.journal_entries(id),
  bank_reference TEXT
);

-- Payment proposal invoices (which invoices are included)
CREATE TABLE public.payment_proposal_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES public.payment_proposals(id) ON DELETE CASCADE NOT NULL,
  invoice_id UUID REFERENCES public.invoices(id) NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'SEK',
  bankgiro TEXT,
  iban TEXT,
  bic TEXT,
  reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_proposal_invoices ENABLE ROW LEVEL SECURITY;

-- RLS policies for payment_proposals
CREATE POLICY "Users can view payment proposals for their companies"
  ON public.payment_proposals FOR SELECT TO authenticated
  USING (company_id IN (SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid()));

CREATE POLICY "Users can insert payment proposals for their companies"
  ON public.payment_proposals FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid()));

CREATE POLICY "Users can update payment proposals for their companies"
  ON public.payment_proposals FOR UPDATE TO authenticated
  USING (company_id IN (SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid()));

-- RLS policies for payment_proposal_invoices
CREATE POLICY "Users can view proposal invoices"
  ON public.payment_proposal_invoices FOR SELECT TO authenticated
  USING (proposal_id IN (SELECT pp.id FROM public.payment_proposals pp WHERE pp.company_id IN (SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid())));

CREATE POLICY "Users can insert proposal invoices"
  ON public.payment_proposal_invoices FOR INSERT TO authenticated
  WITH CHECK (proposal_id IN (SELECT pp.id FROM public.payment_proposals pp WHERE pp.company_id IN (SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid())));

CREATE POLICY "Users can delete proposal invoices"
  ON public.payment_proposal_invoices FOR DELETE TO authenticated
  USING (proposal_id IN (SELECT pp.id FROM public.payment_proposals pp WHERE pp.company_id IN (SELECT ur.company_id FROM public.user_roles ur WHERE ur.user_id = auth.uid())));
