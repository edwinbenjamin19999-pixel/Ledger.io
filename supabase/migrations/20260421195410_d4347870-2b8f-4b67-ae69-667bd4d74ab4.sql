create or replace function public.get_client_revenues(company_ids uuid[])
returns table(company_id uuid, revenue numeric)
language sql stable security definer set search_path = public as $$
  select je.company_id, coalesce(sum(jel.credit - jel.debit), 0)::numeric as revenue
  from journal_entry_lines jel
  join journal_entries je on je.id = jel.journal_entry_id
  join chart_of_accounts coa on coa.id = jel.account_id
  where je.company_id = any(company_ids)
    and je.status in ('approved','posted')
    and je.entry_date >= current_date - interval '12 months'
    and coa.account_number like '3%'
  group by je.company_id;
$$;

grant execute on function public.get_client_revenues(uuid[]) to authenticated;