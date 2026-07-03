
-- Uppdatera skiktgräns för statlig inkomstskatt till korrekt värde 2025 (625 800 kr)
UPDATE public.tax_rules
SET threshold_min = 625800, updated_at = now()
WHERE year = 2025 AND rule_type = 'state_tax';

-- Lägg in 2026 års sociala avgifter och statlig skatt om de saknas (samma värden tillsvidare;
-- dessa kan justeras senare när nya regler offentliggörs)
INSERT INTO public.tax_rules (year, rule_type, municipality, rate, threshold_min, effective_from)
SELECT 2026, 'social_fees', NULL, '0.3142', NULL, '2026-01-01'
WHERE NOT EXISTS (SELECT 1 FROM public.tax_rules WHERE year=2026 AND rule_type='social_fees');

INSERT INTO public.tax_rules (year, rule_type, municipality, rate, threshold_min, effective_from)
SELECT 2026, 'state_tax', NULL, '0.20', 643100, '2026-01-01'
WHERE NOT EXISTS (SELECT 1 FROM public.tax_rules WHERE year=2026 AND rule_type='state_tax');
