INSERT INTO public.skatteverket_credentials (company_id, client_id, client_secret_encrypted, environment, is_active, created_by)
SELECT 
  '536acd6a-df68-45d3-8f22-bf66439b36a2',
  '4b43c546646c3b8b9371d97690e43a4beb2189e169770069',
  'c64d659cde1793d55333ba87c8b94f88fbc424070bb816390be714a852ea0069',
  'production',
  true,
  created_by
FROM companies WHERE id = '536acd6a-df68-45d3-8f22-bf66439b36a2';