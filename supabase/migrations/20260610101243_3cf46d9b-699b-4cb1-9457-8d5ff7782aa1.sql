create or replace function public.dashboard_financials(
  p_company_id uuid,
  p_from date,
  p_to date
)
returns table (
  omsattning numeric,
  ksv numeric,
  ovriga_kostnader numeric,
  resultat numeric,
  bruttomarginal numeric,
  likvida_medel numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  with lines as (
    select
      ca.account_number::int as acct,
      jel.debit,
      jel.credit,
      je.entry_date
    from journal_entry_lines jel
    join journal_entries je   on je.id = jel.journal_entry_id
    join chart_of_accounts ca on ca.id = jel.account_id
    where je.company_id = p_company_id
      and ca.company_id = p_company_id
      and je.status in ('posted','approved')
  ),
  period as (
    select * from lines where entry_date >= p_from and entry_date <= p_to
  ),
  ib_ub as (
    select * from lines where entry_date <= p_to
  ),
  agg as (
    select
      coalesce(sum(case when acct between 3000 and 3799 then credit - debit else 0 end),0) as omsattning,
      coalesce(sum(case when acct between 4000 and 4999 then debit - credit else 0 end),0) as ksv,
      coalesce(sum(case when acct between 5000 and 7999 then debit - credit else 0 end),0) as ovriga_kostnader,
      coalesce(sum(case when acct between 8000 and 8799 then debit - credit else 0 end),0) as fin_poster
    from period
  ),
  likv as (
    select coalesce(sum(debit - credit),0) as likvida_medel
    from ib_ub where acct between 1900 and 1949
  )
  select
    agg.omsattning,
    agg.ksv,
    agg.ovriga_kostnader,
    agg.omsattning - agg.ksv - agg.ovriga_kostnader - agg.fin_poster as resultat,
    case when agg.omsattning > 0
         then round((agg.omsattning - agg.ksv) / agg.omsattning * 100, 1)
         else null end as bruttomarginal,
    likv.likvida_medel
  from agg, likv;
$$;

grant execute on function public.dashboard_financials(uuid, date, date) to authenticated, service_role;
