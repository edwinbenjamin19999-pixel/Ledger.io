-- Helper macro: read = any role; write = owner/cfo/accountant/admin/kam
CREATE TABLE public.hospitality_supplier_intelligence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  supplier_name text NOT NULL,
  supplier_id uuid NULL,
  category text NOT NULL CHECK (category IN ('food','beverage','supplies','services','other')),
  account_number text NULL,
  invoice_count integer NOT NULL DEFAULT 0,
  avg_invoice_amount numeric(14,2) NULL,
  last_invoice_amount numeric(14,2) NULL,
  prev_invoice_amount numeric(14,2) NULL,
  last_invoice_date date NULL,
  prev_invoice_date date NULL,
  price_change_pct numeric(6,2) NULL,
  rolling_30d_total numeric(14,2) NULL,
  rolling_90d_total numeric(14,2) NULL,
  alert_active boolean NOT NULL DEFAULT false,
  alert_reason text NULL,
  computed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, supplier_name, category)
);
CREATE INDEX idx_hsi_company ON public.hospitality_supplier_intelligence(company_id);
CREATE INDEX idx_hsi_alert ON public.hospitality_supplier_intelligence(company_id, alert_active) WHERE alert_active = true;
ALTER TABLE public.hospitality_supplier_intelligence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hsi_select" ON public.hospitality_supplier_intelligence FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(),'owner'::app_role,company_id) OR has_role(auth.uid(),'cfo'::app_role,company_id) OR
    has_role(auth.uid(),'accountant'::app_role,company_id) OR has_role(auth.uid(),'admin'::app_role,company_id) OR
    has_role(auth.uid(),'kam'::app_role,company_id) OR has_role(auth.uid(),'auditor'::app_role,company_id) OR
    has_role(auth.uid(),'board_member'::app_role,company_id) OR has_role(auth.uid(),'limited_user'::app_role,company_id)
  );
CREATE POLICY "hsi_modify" ON public.hospitality_supplier_intelligence FOR ALL TO authenticated
  USING (
    has_role(auth.uid(),'owner'::app_role,company_id) OR has_role(auth.uid(),'cfo'::app_role,company_id) OR
    has_role(auth.uid(),'accountant'::app_role,company_id) OR has_role(auth.uid(),'admin'::app_role,company_id) OR
    has_role(auth.uid(),'kam'::app_role,company_id)
  )
  WITH CHECK (
    has_role(auth.uid(),'owner'::app_role,company_id) OR has_role(auth.uid(),'cfo'::app_role,company_id) OR
    has_role(auth.uid(),'accountant'::app_role,company_id) OR has_role(auth.uid(),'admin'::app_role,company_id) OR
    has_role(auth.uid(),'kam'::app_role,company_id)
  );
CREATE POLICY "hsi_service" ON public.hospitality_supplier_intelligence FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE TRIGGER trg_hsi_updated_at BEFORE UPDATE ON public.hospitality_supplier_intelligence
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.hospitality_reconciliation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  sale_date date NOT NULL,
  pos_total numeric(14,2) NOT NULL DEFAULT 0,
  pos_card numeric(14,2) NOT NULL DEFAULT 0,
  pos_swish numeric(14,2) NOT NULL DEFAULT 0,
  pos_cash numeric(14,2) NOT NULL DEFAULT 0,
  bank_matched_total numeric(14,2) NOT NULL DEFAULT 0,
  diff_amount numeric(14,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'unmatched'
    CHECK (status IN ('matched','partial','unmatched','flagged','manual')),
  matched_transaction_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text NULL,
  reconciled_at timestamptz NULL,
  reconciled_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, sale_date)
);
CREATE INDEX idx_hr_company_date ON public.hospitality_reconciliation(company_id, sale_date DESC);
CREATE INDEX idx_hr_status ON public.hospitality_reconciliation(company_id, status);
ALTER TABLE public.hospitality_reconciliation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hr_select" ON public.hospitality_reconciliation FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(),'owner'::app_role,company_id) OR has_role(auth.uid(),'cfo'::app_role,company_id) OR
    has_role(auth.uid(),'accountant'::app_role,company_id) OR has_role(auth.uid(),'admin'::app_role,company_id) OR
    has_role(auth.uid(),'kam'::app_role,company_id) OR has_role(auth.uid(),'auditor'::app_role,company_id) OR
    has_role(auth.uid(),'board_member'::app_role,company_id) OR has_role(auth.uid(),'limited_user'::app_role,company_id)
  );
CREATE POLICY "hr_modify" ON public.hospitality_reconciliation FOR ALL TO authenticated
  USING (
    has_role(auth.uid(),'owner'::app_role,company_id) OR has_role(auth.uid(),'cfo'::app_role,company_id) OR
    has_role(auth.uid(),'accountant'::app_role,company_id) OR has_role(auth.uid(),'admin'::app_role,company_id) OR
    has_role(auth.uid(),'kam'::app_role,company_id)
  )
  WITH CHECK (
    has_role(auth.uid(),'owner'::app_role,company_id) OR has_role(auth.uid(),'cfo'::app_role,company_id) OR
    has_role(auth.uid(),'accountant'::app_role,company_id) OR has_role(auth.uid(),'admin'::app_role,company_id) OR
    has_role(auth.uid(),'kam'::app_role,company_id)
  );
CREATE POLICY "hr_service" ON public.hospitality_reconciliation FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE TRIGGER trg_hr_updated_at BEFORE UPDATE ON public.hospitality_reconciliation
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.hospitality_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  period_month date NOT NULL,
  insight_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','good','warn','critical')),
  title text NOT NULL,
  body text NOT NULL,
  metric_label text NULL,
  metric_value numeric(14,2) NULL,
  metric_change_pct numeric(6,2) NULL,
  action_suggestion text NULL,
  source_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_receipt text NULL,
  dismissed_at timestamptz NULL,
  dismissed_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_hi_company_period ON public.hospitality_insights(company_id, period_month DESC);
CREATE INDEX idx_hi_active ON public.hospitality_insights(company_id) WHERE dismissed_at IS NULL;
ALTER TABLE public.hospitality_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hi_select" ON public.hospitality_insights FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(),'owner'::app_role,company_id) OR has_role(auth.uid(),'cfo'::app_role,company_id) OR
    has_role(auth.uid(),'accountant'::app_role,company_id) OR has_role(auth.uid(),'admin'::app_role,company_id) OR
    has_role(auth.uid(),'kam'::app_role,company_id) OR has_role(auth.uid(),'auditor'::app_role,company_id) OR
    has_role(auth.uid(),'board_member'::app_role,company_id) OR has_role(auth.uid(),'limited_user'::app_role,company_id)
  );
CREATE POLICY "hi_modify" ON public.hospitality_insights FOR ALL TO authenticated
  USING (
    has_role(auth.uid(),'owner'::app_role,company_id) OR has_role(auth.uid(),'cfo'::app_role,company_id) OR
    has_role(auth.uid(),'accountant'::app_role,company_id) OR has_role(auth.uid(),'admin'::app_role,company_id) OR
    has_role(auth.uid(),'kam'::app_role,company_id)
  )
  WITH CHECK (
    has_role(auth.uid(),'owner'::app_role,company_id) OR has_role(auth.uid(),'cfo'::app_role,company_id) OR
    has_role(auth.uid(),'accountant'::app_role,company_id) OR has_role(auth.uid(),'admin'::app_role,company_id) OR
    has_role(auth.uid(),'kam'::app_role,company_id)
  );
CREATE POLICY "hi_service" ON public.hospitality_insights FOR ALL TO service_role USING (true) WITH CHECK (true);