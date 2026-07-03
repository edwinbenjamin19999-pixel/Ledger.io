-- Remove duplicate empty company created during manual auth user provisioning
-- Keep the original (shorter TEMP id), delete the duplicated one with doubled suffix
DELETE FROM public.user_roles 
WHERE user_id = '90f281a1-04a9-4682-8e01-0a0b0280c5aa'
  AND company_id = '7e7cdcbc-f534-4fc1-9f81-dacae2e94f95';

DELETE FROM public.companies 
WHERE id = '7e7cdcbc-f534-4fc1-9f81-dacae2e94f95';

-- Rename the remaining company to match the real business
UPDATE public.companies
SET name = 'Ursviks Trädgårdsgäng AB',
    org_number = '5594312737',
    updated_at = now()
WHERE id = 'f52527ba-f5ce-4385-8b68-9803686ae8a2';