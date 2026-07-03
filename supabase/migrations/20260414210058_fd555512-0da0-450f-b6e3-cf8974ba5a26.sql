
-- Add missing account 2898 to the seed function by inserting it directly for all companies that have been seeded
-- Also add 2893 (Skuld till anställda utlägg) if missing
INSERT INTO public.chart_of_accounts (company_id, account_number, account_name, account_type)
SELECT c.id, '2898', 'Outtagen utdelning', 'liability'
FROM public.companies c
WHERE NOT EXISTS (
  SELECT 1 FROM public.chart_of_accounts ca 
  WHERE ca.company_id = c.id AND ca.account_number = '2898'
);
