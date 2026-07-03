-- Add essential VAT accounts to chart of accounts for RE Equity Partners AB
INSERT INTO chart_of_accounts (company_id, account_number, account_name, account_type, is_active)
VALUES 
  -- Ingående moms (VAT to be reclaimed)
  ('c120b4cf-9067-4c02-8b38-17eaa921dc6f', '2640', 'Ingående moms', 'liability', true),
  ('c120b4cf-9067-4c02-8b38-17eaa921dc6f', '2641', 'Utgående moms 25%', 'liability', true),
  ('c120b4cf-9067-4c02-8b38-17eaa921dc6f', '2611', 'Leverantörsskulder', 'liability', true),
  ('c120b4cf-9067-4c02-8b38-17eaa921dc6f', '2440', 'Leverantörsskulder', 'liability', true),
  ('c120b4cf-9067-4c02-8b38-17eaa921dc6f', '1930', 'Företagskonto / Checkkonto', 'asset', true),
  ('c120b4cf-9067-4c02-8b38-17eaa921dc6f', '6540', 'Kontorsmaterial', 'expense', true),
  ('c120b4cf-9067-4c02-8b38-17eaa921dc6f', '6570', 'Kontorsmaskiner och inventarier', 'expense', true),
  ('c120b4cf-9067-4c02-8b38-17eaa921dc6f', '3000', 'Försäljning', 'income', true),
  ('c120b4cf-9067-4c02-8b38-17eaa921dc6f', '4000', 'Inköp varor', 'expense', true)
ON CONFLICT (company_id, account_number) DO NOTHING;