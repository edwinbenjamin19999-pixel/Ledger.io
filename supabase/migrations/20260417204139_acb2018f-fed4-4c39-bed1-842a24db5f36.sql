CREATE TABLE public.securities_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  account_type TEXT NOT NULL CHECK (account_type IN ('isk','kf','af','depot_ab')),
  broker TEXT NOT NULL CHECK (broker IN ('nordnet','avanza','seb','handelsbanken','swedbank','nordea','other')),
  account_name TEXT NOT NULL,
  account_number TEXT,
  opening_balance NUMERIC(18,2) DEFAULT 0,
  opening_date DATE,
  owner_personnummer TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_securities_accounts_company ON public.securities_accounts(company_id);

CREATE TABLE public.securities_holdings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  securities_account_id UUID NOT NULL REFERENCES public.securities_accounts(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  isin TEXT, ticker TEXT, name TEXT NOT NULL,
  quantity NUMERIC(18,6) NOT NULL DEFAULT 0,
  avg_cost NUMERIC(18,4) DEFAULT 0,
  current_price NUMERIC(18,4) DEFAULT 0,
  current_value NUMERIC(18,2) DEFAULT 0,
  currency TEXT DEFAULT 'SEK',
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_securities_holdings_account ON public.securities_holdings(securities_account_id);
CREATE INDEX idx_securities_holdings_company ON public.securities_holdings(company_id);
CREATE INDEX idx_securities_holdings_isin ON public.securities_holdings(isin);

CREATE TABLE public.securities_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  securities_account_id UUID NOT NULL REFERENCES public.securities_accounts(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  trade_date DATE NOT NULL,
  settlement_date DATE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('buy','sell','dividend','fee','tax','deposit','withdrawal','split','transfer_in','transfer_out')),
  isin TEXT, ticker TEXT, name TEXT,
  quantity NUMERIC(18,6) DEFAULT 0,
  price NUMERIC(18,4) DEFAULT 0,
  amount NUMERIC(18,2) NOT NULL,
  fee NUMERIC(18,2) DEFAULT 0,
  currency TEXT DEFAULT 'SEK',
  fx_rate NUMERIC(18,6) DEFAULT 1,
  journal_entry_id UUID REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','sru','csv','nordnet_api','avanza_api','annual_statement')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_securities_transactions_account ON public.securities_transactions(securities_account_id);
CREATE INDEX idx_securities_transactions_company ON public.securities_transactions(company_id);
CREATE INDEX idx_securities_transactions_date ON public.securities_transactions(trade_date);
CREATE INDEX idx_securities_transactions_isin ON public.securities_transactions(isin);

CREATE TABLE public.securities_tax_calculations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  securities_account_id UUID REFERENCES public.securities_accounts(id) ON DELETE CASCADE,
  tax_year INTEGER NOT NULL,
  calculation_type TEXT NOT NULL CHECK (calculation_type IN ('isk_schablon','k4_capital_gains','kf_avkastningsskatt','depot_ab_dividend')),
  capital_base NUMERIC(18,2) DEFAULT 0,
  tax_rate NUMERIC(8,4) DEFAULT 0,
  tax_amount NUMERIC(18,2) DEFAULT 0,
  calculation_data JSONB DEFAULT '{}'::jsonb,
  journal_entry_id UUID REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','final','booked','submitted')),
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_securities_tax_company_year ON public.securities_tax_calculations(company_id, tax_year);

ALTER TABLE public.securities_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.securities_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.securities_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.securities_tax_calculations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sec_accounts_all" ON public.securities_accounts FOR ALL
  USING (public.has_company_access(auth.uid(), company_id))
  WITH CHECK (public.has_company_access(auth.uid(), company_id));
CREATE POLICY "sec_holdings_all" ON public.securities_holdings FOR ALL
  USING (public.has_company_access(auth.uid(), company_id))
  WITH CHECK (public.has_company_access(auth.uid(), company_id));
CREATE POLICY "sec_tx_all" ON public.securities_transactions FOR ALL
  USING (public.has_company_access(auth.uid(), company_id))
  WITH CHECK (public.has_company_access(auth.uid(), company_id));
CREATE POLICY "sec_tax_all" ON public.securities_tax_calculations FOR ALL
  USING (public.has_company_access(auth.uid(), company_id))
  WITH CHECK (public.has_company_access(auth.uid(), company_id));

CREATE TRIGGER update_securities_accounts_updated_at
  BEFORE UPDATE ON public.securities_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();