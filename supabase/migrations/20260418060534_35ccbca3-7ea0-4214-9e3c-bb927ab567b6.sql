-- Set Amir's primary test company to restaurant industry so the hospitality vertical activates
UPDATE public.companies
SET industry = 'restaurant'
WHERE id = '1f085ed1-7e2d-4675-9583-9f9c19f84b2d';

-- Remove the duplicate test company (and cascade-related role/permission rows)
DELETE FROM public.user_permissions WHERE company_id = 'ed464cc8-e287-4fc6-ad57-79e08505c91b';
DELETE FROM public.user_roles WHERE company_id = 'ed464cc8-e287-4fc6-ad57-79e08505c91b';
DELETE FROM public.companies WHERE id = 'ed464cc8-e287-4fc6-ad57-79e08505c91b';