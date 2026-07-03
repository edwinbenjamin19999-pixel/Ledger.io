-- Create tax_rules table for dynamic tax calculations
CREATE TABLE IF NOT EXISTS public.tax_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL,
  rule_type TEXT NOT NULL,
  municipality TEXT,
  rate TEXT,
  threshold_min NUMERIC,
  threshold_max NUMERIC,
  base_amount NUMERIC,
  percentage NUMERIC,
  effective_from DATE NOT NULL,
  effective_to DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tax_rules ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read tax rules
CREATE POLICY "Users can view tax rules"
  ON public.tax_rules
  FOR SELECT
  TO authenticated
  USING (true);

-- Only owners can manage tax rules
CREATE POLICY "Owners can manage tax rules"
  ON public.tax_rules
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'owner'::app_role));

-- Create index for performance
CREATE INDEX idx_tax_rules_lookup ON public.tax_rules(year, rule_type, effective_from);
CREATE INDEX idx_tax_rules_municipality ON public.tax_rules(municipality, year) WHERE municipality IS NOT NULL;

-- Insert 2025 tax rules

-- Basic allowance (Grundavdrag) - Progressive based on income
INSERT INTO public.tax_rules (year, rule_type, threshold_min, threshold_max, base_amount, percentage, effective_from) VALUES
(2025, 'basic_allowance', 0, 38000, 0, 0.293, '2025-01-01'),
(2025, 'basic_allowance', 38000, 111000, 11134, 0.145, '2025-01-01'),
(2025, 'basic_allowance', 111000, 449200, 21719, 0.20, '2025-01-01'),
(2025, 'basic_allowance', 449200, 667300, 89359, 0.10, '2025-01-01'),
(2025, 'basic_allowance', 667300, 999999999, 111169, 0, '2025-01-01');

-- State tax (Statlig skatt) - 20% over threshold
INSERT INTO public.tax_rules (year, rule_type, threshold_min, rate, effective_from) VALUES
(2025, 'state_tax', 598500, '0.20', '2025-01-01');

-- Social fees (Arbetsgivaravgifter) - Standard 31.42%
INSERT INTO public.tax_rules (year, rule_type, rate, effective_from) VALUES
(2025, 'social_fees', '0.3142', '2025-01-01');

-- Municipal tax rates for major Swedish municipalities (kommunalskatt)
INSERT INTO public.tax_rules (year, rule_type, municipality, rate, effective_from) VALUES
(2025, 'municipal_tax', 'stockholm', '0.3085', '2025-01-01'),
(2025, 'municipal_tax', 'göteborg', '0.3275', '2025-01-01'),
(2025, 'municipal_tax', 'malmö', '0.3234', '2025-01-01'),
(2025, 'municipal_tax', 'uppsala', '0.3285', '2025-01-01'),
(2025, 'municipal_tax', 'västerås', '0.3340', '2025-01-01'),
(2025, 'municipal_tax', 'örebro', '0.3265', '2025-01-01'),
(2025, 'municipal_tax', 'linköping', '0.3310', '2025-01-01'),
(2025, 'municipal_tax', 'helsingborg', '0.3224', '2025-01-01'),
(2025, 'municipal_tax', 'jönköping', '0.3325', '2025-01-01'),
(2025, 'municipal_tax', 'norrköping', '0.3360', '2025-01-01'),
(2025, 'municipal_tax', 'lund', '0.3195', '2025-01-01'),
(2025, 'municipal_tax', 'umeå', '0.3260', '2025-01-01'),
(2025, 'municipal_tax', 'gävle', '0.3365', '2025-01-01'),
(2025, 'municipal_tax', 'borås', '0.3295', '2025-01-01'),
(2025, 'municipal_tax', 'eskilstuna', '0.3350', '2025-01-01');

-- Tax tables 30-36 for regular employees (under 65 years)
-- Based on annual salary thresholds
INSERT INTO public.tax_rules (year, rule_type, threshold_min, threshold_max, effective_from) VALUES
(2025, 'tax_table_30', 0, 150000, '2025-01-01'),
(2025, 'tax_table_31', 150000, 250000, '2025-01-01'),
(2025, 'tax_table_32', 250000, 350000, '2025-01-01'),
(2025, 'tax_table_33', 350000, 450000, '2025-01-01'),
(2025, 'tax_table_34', 450000, 550000, '2025-01-01'),
(2025, 'tax_table_35', 550000, 650000, '2025-01-01'),
(2025, 'tax_table_36', 650000, 999999999, '2025-01-01');

-- Tax tables 37-40 for pensioners (65+ years)
INSERT INTO public.tax_rules (year, rule_type, threshold_min, threshold_max, effective_from) VALUES
(2025, 'tax_table_37', 0, 200000, '2025-01-01'),
(2025, 'tax_table_38', 200000, 400000, '2025-01-01'),
(2025, 'tax_table_39', 400000, 600000, '2025-01-01'),
(2025, 'tax_table_40', 600000, 999999999, '2025-01-01');

-- Add trigger for updated_at
CREATE TRIGGER update_tax_rules_updated_at
  BEFORE UPDATE ON public.tax_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();