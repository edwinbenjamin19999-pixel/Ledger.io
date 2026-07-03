-- Add missing Södertälje municipality to tax rules
INSERT INTO public.tax_rules (year, rule_type, municipality, rate, effective_from) VALUES
(2025, 'municipal_tax', 'södertälje', '0.3310', '2025-01-01');