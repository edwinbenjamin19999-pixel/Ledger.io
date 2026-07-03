-- Create bank_accounts table
CREATE TABLE public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  bank_name TEXT NOT NULL,
  account_name TEXT NOT NULL,
  iban TEXT NOT NULL,
  account_number TEXT,
  currency TEXT NOT NULL DEFAULT 'SEK',
  balance NUMERIC,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  bank_connection_id TEXT, -- ID from GoCardless/Nordigen
  requisition_id TEXT, -- GoCardless requisition ID
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bank_transactions table
CREATE TABLE public.bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  transaction_id TEXT NOT NULL, -- External bank transaction ID
  booking_date DATE NOT NULL,
  value_date DATE,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'SEK',
  counterparty_name TEXT,
  counterparty_account TEXT,
  reference TEXT,
  description TEXT,
  transaction_type TEXT, -- DEBIT/CREDIT
  matched_transaction_id UUID REFERENCES public.transactions(id),
  matched_invoice_id UUID REFERENCES public.invoices(id),
  suggested_account_id UUID REFERENCES public.chart_of_accounts(id),
  ai_confidence NUMERIC,
  ai_explanation TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, matched, booked, ignored
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(bank_account_id, transaction_id)
);

-- Create bank_matching_rules table
CREATE TABLE public.bank_matching_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  rule_name TEXT NOT NULL,
  match_field TEXT NOT NULL, -- counterparty_name, reference, description
  match_pattern TEXT NOT NULL,
  suggested_account_id UUID REFERENCES public.chart_of_accounts(id),
  suggested_vat_code TEXT,
  auto_approve BOOLEAN NOT NULL DEFAULT false,
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_matching_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bank_accounts
CREATE POLICY "Users can view bank accounts for accessible companies"
  ON public.bank_accounts FOR SELECT
  USING (has_company_access(auth.uid(), company_id));

CREATE POLICY "Owners and accountants can manage bank accounts"
  ON public.bank_accounts FOR ALL
  USING (
    has_company_access(auth.uid(), company_id) AND
    (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'accountant'::app_role))
  );

-- RLS Policies for bank_transactions
CREATE POLICY "Users can view bank transactions for accessible companies"
  ON public.bank_transactions FOR SELECT
  USING (has_company_access(auth.uid(), company_id));

CREATE POLICY "Accountants can manage bank transactions"
  ON public.bank_transactions FOR ALL
  USING (
    has_company_access(auth.uid(), company_id) AND
    (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'accountant'::app_role))
  );

-- RLS Policies for bank_matching_rules
CREATE POLICY "Users can view matching rules for accessible companies"
  ON public.bank_matching_rules FOR SELECT
  USING (has_company_access(auth.uid(), company_id));

CREATE POLICY "Accountants can manage matching rules"
  ON public.bank_matching_rules FOR ALL
  USING (
    has_company_access(auth.uid(), company_id) AND
    (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'accountant'::app_role))
  );

-- Triggers for updated_at
CREATE TRIGGER update_bank_accounts_updated_at
  BEFORE UPDATE ON public.bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bank_matching_rules_updated_at
  BEFORE UPDATE ON public.bank_matching_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();