-- =====================================================
-- Enhanced Security & Validation Layer
-- =====================================================

-- AI Feedback table for learning from corrections
CREATE TABLE public.ai_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journal_entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  original_suggestion JSONB NOT NULL,
  corrected_data JSONB NOT NULL,
  correction_type TEXT NOT NULL, -- 'account', 'amount', 'vat', 'classification'
  corrected_by UUID NOT NULL REFERENCES public.profiles(id),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  document_pattern TEXT, -- Pattern extracted from document for future matching
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Validation rules table (company-specific rules)
CREATE TABLE public.validation_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL, -- 'account_mapping', 'vat_rate', 'supplier_default'
  rule_key TEXT NOT NULL, -- e.g., supplier name, keyword
  rule_value JSONB NOT NULL, -- e.g., {"account": "6420", "vat_code": "25"}
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit review log
CREATE TABLE public.review_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journal_entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id),
  review_action TEXT NOT NULL, -- 'approved', 'rejected', 'corrected'
  review_notes TEXT,
  changes_made JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_ai_feedback_company ON public.ai_feedback(company_id);
CREATE INDEX idx_ai_feedback_journal ON public.ai_feedback(journal_entry_id);
CREATE INDEX idx_validation_rules_company ON public.validation_rules(company_id);
CREATE INDEX idx_validation_rules_type ON public.validation_rules(rule_type);
CREATE INDEX idx_review_logs_journal ON public.review_logs(journal_entry_id);
CREATE INDEX idx_review_logs_reviewer ON public.review_logs(reviewer_id);

-- Enable RLS
ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_feedback
CREATE POLICY "Users can view feedback for accessible companies"
ON public.ai_feedback FOR SELECT
USING (public.has_company_access(auth.uid(), company_id));

CREATE POLICY "Accountants can insert feedback"
ON public.ai_feedback FOR INSERT
WITH CHECK (
  public.has_company_access(auth.uid(), company_id) AND
  (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'accountant') OR public.has_role(auth.uid(), 'auditor'))
);

-- RLS Policies for validation_rules
CREATE POLICY "Users can view rules for accessible companies"
ON public.validation_rules FOR SELECT
USING (public.has_company_access(auth.uid(), company_id));

CREATE POLICY "Owners and accountants can manage rules"
ON public.validation_rules FOR ALL
USING (
  public.has_company_access(auth.uid(), company_id) AND
  (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'accountant'))
);

-- RLS Policies for review_logs
CREATE POLICY "Users can view review logs for accessible companies"
ON public.review_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.journal_entries je
    WHERE je.id = review_logs.journal_entry_id
    AND public.has_company_access(auth.uid(), je.company_id)
  )
);

CREATE POLICY "Reviewers can insert review logs"
ON public.review_logs FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.journal_entries je
    WHERE je.id = review_logs.journal_entry_id
    AND public.has_company_access(auth.uid(), je.company_id)
  )
);

-- Triggers
CREATE TRIGGER update_validation_rules_updated_at
BEFORE UPDATE ON public.validation_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to get AI learning data for a company
CREATE OR REPLACE FUNCTION public.get_ai_learning_data(
  _company_id UUID,
  _limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  pattern TEXT,
  suggested_account TEXT,
  correction_count INTEGER
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    document_pattern as pattern,
    corrected_data->>'account' as suggested_account,
    COUNT(*)::INTEGER as correction_count
  FROM public.ai_feedback
  WHERE company_id = _company_id
    AND document_pattern IS NOT NULL
  GROUP BY document_pattern, corrected_data->>'account'
  ORDER BY correction_count DESC
  LIMIT _limit
$$;