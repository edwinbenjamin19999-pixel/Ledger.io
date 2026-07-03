create or replace function public.ar_company_id(_ar_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select company_id from public.annual_reports where id = _ar_id
$$;