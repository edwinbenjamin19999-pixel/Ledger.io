create or replace function public.dashboard_financials(p_company_id uuid, p_from date, p_to date)
returns table(omsattning numeric, ksv numeric, ovriga numeric, resultat numeric, bruttomarginal numeric, likvida numeric)
language sql
stable
security invoker
set search_path = public
as $$
  with finalized_lines as (
    select
      ca.account_number::int as acct,
      coalesce(jel.debit, 0)::numeric as debit,
      coalesce(jel.credit, 0)::numeric as credit,
      je.entry_date
    from public.journal_entry_lines jel
    join public.journal_entries je on je.id = jel.journal_entry_id
    join public.chart_of_accounts ca on ca.id = jel.account_id
    where je.company_id = p_company_id
      and ca.company_id = p_company_id
      and lower(coalesce(je.status::text, '')) in (
        'approved',
        'posted',
        'godkand',
        'godkänd',
        'bokford',
        'bokförd',
        'booked',
        'completed',
        'confirmed'
      )
  ),
  period_lines as (
    select *
    from finalized_lines
    where entry_date between p_from and p_to
  ),
  period_agg as (
    select
      coalesce(sum(case when acct between 3000 and 3799 then credit - debit end), 0) as omsattning,
      coalesce(sum(case when acct between 4000 and 4999 then debit - credit end), 0) as ksv,
      coalesce(sum(case when acct between 5000 and 7999 then debit - credit end), 0) as ovriga,
      coalesce(sum(case when acct between 8000 and 8799 then debit - credit end), 0) as fin
    from period_lines
  ),
  cash_agg as (
    select coalesce(sum(debit - credit), 0) as likvida
    from finalized_lines
    where acct between 1900 and 1949
      and entry_date <= p_to
  )
  select
    period_agg.omsattning,
    period_agg.ksv,
    period_agg.ovriga,
    period_agg.omsattning - period_agg.ksv - period_agg.ovriga - period_agg.fin as resultat,
    case
      when period_agg.omsattning > 0 and period_agg.ksv > 0
        then round((period_agg.omsattning - period_agg.ksv) / period_agg.omsattning * 100, 1)
      else null
    end as bruttomarginal,
    cash_agg.likvida
  from period_agg, cash_agg;
$$;

grant execute on function public.dashboard_financials(uuid, date, date) to authenticated, service_role;