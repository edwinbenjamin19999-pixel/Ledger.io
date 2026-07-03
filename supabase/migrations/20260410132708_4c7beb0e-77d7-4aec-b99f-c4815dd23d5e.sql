
-- Platform connections
CREATE TABLE IF NOT EXISTS public.platform_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  platform text NOT NULL,
  credentials_encrypted jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'disconnected',
  last_sync_at timestamptz,
  sync_cursor text,
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, platform)
);
ALTER TABLE public.platform_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own company platform connections" ON public.platform_connections
  FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

-- E-commerce orders
CREATE TABLE IF NOT EXISTS public.ecommerce_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  platform text NOT NULL,
  platform_order_id text NOT NULL,
  order_date timestamptz NOT NULL,
  currency text NOT NULL DEFAULT 'SEK',
  customer_country text,
  customer_vat_number text,
  gross_amount numeric NOT NULL DEFAULT 0,
  gross_amount_sek numeric NOT NULL DEFAULT 0,
  shipping_amount_sek numeric DEFAULT 0,
  discount_amount_sek numeric DEFAULT 0,
  platform_fee_sek numeric DEFAULT 0,
  payment_fee_sek numeric DEFAULT 0,
  vat_amount_sek numeric DEFAULT 0,
  net_revenue_sek numeric DEFAULT 0,
  refunded_amount_sek numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  payout_id uuid,
  bookkeeping_entry_id uuid,
  sync_metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, platform, platform_order_id)
);
ALTER TABLE public.ecommerce_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own company ecommerce orders" ON public.ecommerce_orders
  FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

-- E-commerce order lines
CREATE TABLE IF NOT EXISTS public.ecommerce_order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.ecommerce_orders(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id text,
  product_name text,
  sku text,
  quantity integer NOT NULL DEFAULT 1,
  unit_price_sek numeric NOT NULL DEFAULT 0,
  vat_rate numeric DEFAULT 25,
  vat_amount_sek numeric DEFAULT 0,
  line_total_sek numeric NOT NULL DEFAULT 0,
  product_category text DEFAULT 'physical_25',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ecommerce_order_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own company order lines" ON public.ecommerce_order_lines
  FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

-- E-commerce payouts
CREATE TABLE IF NOT EXISTS public.ecommerce_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  platform text NOT NULL,
  platform_payout_id text,
  payout_date timestamptz NOT NULL,
  currency text NOT NULL DEFAULT 'SEK',
  gross_amount_sek numeric NOT NULL DEFAULT 0,
  fees_sek numeric DEFAULT 0,
  net_amount_sek numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  matched_bank_transaction_id uuid,
  order_ids jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ecommerce_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own company payouts" ON public.ecommerce_payouts
  FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

-- Sync log
CREATE TABLE IF NOT EXISTS public.sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  platform text NOT NULL,
  orders_fetched integer DEFAULT 0,
  orders_booked integer DEFAULT 0,
  errors jsonb DEFAULT '[]'::jsonb,
  duration_ms integer DEFAULT 0,
  synced_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sync_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own company sync logs" ON public.sync_log
  FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

-- EU VAT rates
CREATE TABLE IF NOT EXISTS public.eu_vat_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL UNIQUE,
  country_name text NOT NULL,
  standard_rate numeric NOT NULL,
  reduced_rate numeric,
  reduced_rate_2 numeric,
  super_reduced_rate numeric,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.eu_vat_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can read EU VAT rates" ON public.eu_vat_rates FOR SELECT USING (true);

INSERT INTO public.eu_vat_rates (country_code, country_name, standard_rate, reduced_rate, reduced_rate_2) VALUES
  ('AT','Österrike',20,10,13),('BE','Belgien',21,6,12),('BG','Bulgarien',20,9,NULL),
  ('HR','Kroatien',25,5,13),('CY','Cypern',19,5,9),('CZ','Tjeckien',21,12,NULL),
  ('DK','Danmark',25,NULL,NULL),('EE','Estland',22,9,NULL),('FI','Finland',25.5,10,14),
  ('FR','Frankrike',20,5.5,10),('DE','Tyskland',19,7,NULL),('GR','Grekland',24,6,13),
  ('HU','Ungern',27,5,18),('IE','Irland',23,9,13.5),('IT','Italien',22,5,10),
  ('LV','Lettland',21,12,5),('LT','Litauen',21,9,5),('LU','Luxemburg',17,8,14),
  ('MT','Malta',18,5,7),('NL','Nederländerna',21,9,NULL),('PL','Polen',23,5,8),
  ('PT','Portugal',23,6,13),('RO','Rumänien',19,5,9),('SK','Slovakien',23,10,NULL),
  ('SI','Slovenien',22,5,9.5),('ES','Spanien',21,10,4),('SE','Sverige',25,6,12)
ON CONFLICT (country_code) DO NOTHING;

-- Product costs
CREATE TABLE IF NOT EXISTS public.product_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  sku text NOT NULL,
  product_name text,
  supplier text,
  cost_price_sek numeric NOT NULL DEFAULT 0,
  currency text DEFAULT 'SEK',
  last_updated timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, sku)
);
ALTER TABLE public.product_costs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own company product costs" ON public.product_costs
  FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

-- Inventory
CREATE TABLE IF NOT EXISTS public.ecommerce_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  sku text NOT NULL,
  product_name text,
  platform text,
  current_stock integer NOT NULL DEFAULT 0,
  reserved_stock integer NOT NULL DEFAULT 0,
  reorder_point integer DEFAULT 10,
  reorder_quantity integer DEFAULT 50,
  cost_price_sek numeric DEFAULT 0,
  last_updated timestamptz NOT NULL DEFAULT now(),
  sync_source text,
  UNIQUE(company_id, sku)
);
ALTER TABLE public.ecommerce_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own company inventory" ON public.ecommerce_inventory
  FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

-- Return events
CREATE TABLE IF NOT EXISTS public.return_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.ecommerce_orders(id),
  platform text NOT NULL,
  platform_return_id text,
  return_date timestamptz NOT NULL DEFAULT now(),
  return_type text NOT NULL DEFAULT 'full',
  refund_amount_sek numeric NOT NULL DEFAULT 0,
  restocking_fee_sek numeric DEFAULT 0,
  reason text,
  returnable_to_stock boolean DEFAULT true,
  correction_entry_id uuid,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.return_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own company return events" ON public.return_events
  FOR ALL TO authenticated
  USING (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()));

-- Enable realtime for orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.ecommerce_orders;
