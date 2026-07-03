CREATE TABLE IF NOT EXISTS kassaregister_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  sale_date DATE NOT NULL,
  receipt_number TEXT,
  gross_amount NUMERIC(10,2) DEFAULT 0,
  vat_6 NUMERIC(10,2) DEFAULT 0,
  vat_12 NUMERIC(10,2) DEFAULT 0,
  vat_25 NUMERIC(10,2) DEFAULT 0,
  payment_method TEXT DEFAULT 'card',
  pos_system TEXT,
  z_report_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE kassaregister_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kassaregister_sales_select" ON kassaregister_sales
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid())
  );

CREATE POLICY "kassaregister_sales_insert" ON kassaregister_sales
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid())
  );

CREATE POLICY "kassaregister_sales_update" ON kassaregister_sales
  FOR UPDATE USING (
    company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid())
  );

CREATE POLICY "kassaregister_sales_delete" ON kassaregister_sales
  FOR DELETE USING (
    company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid())
  );

CREATE INDEX idx_kassaregister_sales_company_date ON kassaregister_sales(company_id, sale_date);