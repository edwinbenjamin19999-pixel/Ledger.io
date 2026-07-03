drop function if exists public.dashboard_financials(uuid, date, date);

create function public.dashboard_financials(p_company_id uuid, p_from date, p_to date)
returns table(omsattning numeric, ksv numeric, ovriga numeric, resultat numeric, bruttomarginal numeric, likvida numeric)
language sql stable security invoker
set search_path = public
as $$
  with l as (
    select ca.account_number::int acct, jel.debit, jel.credit, je.entry_date
    from public.journal_entry_lines jel
    join public.journal_entries je on je.id=jel.journal_entry_id
    join public.chart_of_accounts ca on ca.id=jel.account_id
    where je.company_id=p_company_id and ca.company_id=p_company_id
      and je.status in ('posted','approved')
  ),
  p as (select * from l where entry_date between p_from and p_to),
  a as (
    select
      coalesce(sum(case when acct between 3000 and 3799 then credit-debit end),0) omsattning,
      coalesce(sum(case when acct between 4000 and 4999 then debit-credit end),0) ksv,
      coalesce(sum(case when acct between 5000 and 7999 then debit-credit end),0) ovriga,
      coalesce(sum(case when acct between 8000 and 8799 then debit-credit end),0) fin
    from p),
  k as (select coalesce(sum(debit-credit),0) likvida from l where acct between 1900 and 1949 and entry_date<=p_to)
  select a.omsattning, a.ksv, a.ovriga,
         a.omsattning-a.ksv-a.ovriga-a.fin as resultat,
         case when a.omsattning>0 then round((a.omsattning-a.ksv)/a.omsattning*100,1) end as bruttomarginal,
         k.likvida
  from a,k;
$$;

grant execute on function public.dashboard_financials(uuid, date, date) to authenticated, service_role;