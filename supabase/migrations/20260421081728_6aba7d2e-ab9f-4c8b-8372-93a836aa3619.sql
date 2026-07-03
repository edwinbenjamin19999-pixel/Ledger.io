alter table public.companies
  add column if not exists registration_date date,
  add column if not exists sni_codes jsonb,
  add column if not exists legal_form text,
  add column if not exists bolagsverket_synced_at timestamptz,
  add column if not exists bolagsverket_data jsonb,
  add column if not exists engagements_status text;

create or replace function public.check_company_already_registered(_org_number text)
returns table(exists_already boolean, company_id uuid, company_name text)
language sql
stable
security definer
set search_path = public
as $$
  select true, c.id, c.name
  from public.companies c
  where c.org_number = _org_number
  limit 1;
$$;

grant execute on function public.check_company_already_registered(text) to authenticated;