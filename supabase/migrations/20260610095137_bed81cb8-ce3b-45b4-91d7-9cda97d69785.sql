
CREATE OR REPLACE FUNCTION public.dashboard_kpis(
  p_company_id uuid,
  p_from date,
  p_to date,
  p_prev_from date,
  p_prev_to date
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_revenue numeric := 0;
  v_cogs numeric := 0;
  v_opex numeric := 0;
  v_prev_revenue numeric := 0;
  v_prev_cogs numeric := 0;
  v_prev_opex numeric := 0;
  v_cash numeric := 0;
  v_prev_cash numeric := 0;
  v_ar numeric := 0;
  v_prev_ar numeric := 0;
  v_ap numeric := 0;
  v_prev_ap numeric := 0;
  v_spark jsonb;
  v_spark_start date := (date_trunc('month', p_to::timestamp) - interval '5 months')::date;
  v_spark_end date := (date_trunc('month', p_to::timestamp) + interval '1 month - 1 day')::date;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- P&L for selected period
  SELECT
    COALESCE(SUM(CASE WHEN coa.account_number BETWEEN '3000' AND '3799' THEN COALESCE(jel.credit,0) - COALESCE(jel.debit,0) END), 0),
    COALESCE(SUM(CASE WHEN coa.account_number BETWEEN '4000' AND '4999' THEN COALESCE(jel.debit,0) - COALESCE(jel.credit,0) END), 0),
    COALESCE(SUM(CASE WHEN coa.account_number BETWEEN '5000' AND '7999' THEN COALESCE(jel.debit,0) - COALESCE(jel.credit,0) END), 0)
  INTO v_revenue, v_cogs, v_opex
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON je.id = jel.journal_entry_id
  JOIN public.chart_of_accounts coa ON coa.id = jel.account_id
  WHERE je.company_id = p_company_id
    AND je.status IN ('posted','approved','pending_approval')
    AND je.entry_date BETWEEN p_from AND p_to;

  -- P&L previous period
  SELECT
    COALESCE(SUM(CASE WHEN coa.account_number BETWEEN '3000' AND '3799' THEN COALESCE(jel.credit,0) - COALESCE(jel.debit,0) END), 0),
    COALESCE(SUM(CASE WHEN coa.account_number BETWEEN '4000' AND '4999' THEN COALESCE(jel.debit,0) - COALESCE(jel.credit,0) END), 0),
    COALESCE(SUM(CASE WHEN coa.account_number BETWEEN '5000' AND '7999' THEN COALESCE(jel.debit,0) - COALESCE(jel.credit,0) END), 0)
  INTO v_prev_revenue, v_prev_cogs, v_prev_opex
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON je.id = jel.journal_entry_id
  JOIN public.chart_of_accounts coa ON coa.id = jel.account_id
  WHERE je.company_id = p_company_id
    AND je.status IN ('posted','approved','pending_approval')
    AND je.entry_date BETWEEN p_prev_from AND p_prev_to;

  -- Cumulative balances at end of current period
  SELECT
    COALESCE(SUM(CASE WHEN coa.account_number BETWEEN '1910' AND '1949' THEN COALESCE(jel.debit,0) - COALESCE(jel.credit,0) END), 0),
    COALESCE(SUM(CASE WHEN coa.account_number BETWEEN '1500' AND '1599' THEN COALESCE(jel.debit,0) - COALESCE(jel.credit,0) END), 0),
    COALESCE(SUM(CASE WHEN coa.account_number BETWEEN '2440' AND '2449' THEN COALESCE(jel.credit,0) - COALESCE(jel.debit,0) END), 0)
  INTO v_cash, v_ar, v_ap
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON je.id = jel.journal_entry_id
  JOIN public.chart_of_accounts coa ON coa.id = jel.account_id
  WHERE je.company_id = p_company_id
    AND je.status IN ('posted','approved','pending_approval')
    AND je.entry_date <= p_to;

  -- Cumulative balances at end of previous period
  SELECT
    COALESCE(SUM(CASE WHEN coa.account_number BETWEEN '1910' AND '1949' THEN COALESCE(jel.debit,0) - COALESCE(jel.credit,0) END), 0),
    COALESCE(SUM(CASE WHEN coa.account_number BETWEEN '1500' AND '1599' THEN COALESCE(jel.debit,0) - COALESCE(jel.credit,0) END), 0),
    COALESCE(SUM(CASE WHEN coa.account_number BETWEEN '2440' AND '2449' THEN COALESCE(jel.credit,0) - COALESCE(jel.debit,0) END), 0)
  INTO v_prev_cash, v_prev_ar, v_prev_ap
  FROM public.journal_entry_lines jel
  JOIN public.journal_entries je ON je.id = jel.journal_entry_id
  JOIN public.chart_of_accounts coa ON coa.id = jel.account_id
  WHERE je.company_id = p_company_id
    AND je.status IN ('posted','approved','pending_approval')
    AND je.entry_date <= p_prev_to;

  -- 6-month sparkline (single scan of relevant lines)
  WITH months AS (
    SELECT generate_series(v_spark_start, v_spark_end, interval '1 month')::date AS m_start
  ),
  base AS (
    SELECT je.entry_date,
           COALESCE(jel.debit,0)  AS debit,
           COALESCE(jel.credit,0) AS credit,
           coa.account_number
    FROM public.journal_entry_lines jel
    JOIN public.journal_entries je ON je.id = jel.journal_entry_id
    JOIN public.chart_of_accounts coa ON coa.id = jel.account_id
    WHERE je.company_id = p_company_id
      AND je.status IN ('posted','approved','pending_approval')
      AND je.entry_date <= v_spark_end
  ),
  per_month AS (
    SELECT
      m.m_start,
      COALESCE(SUM(b.credit - b.debit) FILTER (
        WHERE b.entry_date >= m.m_start
          AND b.entry_date <  (m.m_start + interval '1 month')::date
          AND b.account_number BETWEEN '3000' AND '3799'
      ), 0) AS rev,
      COALESCE(SUM(b.debit - b.credit) FILTER (
        WHERE b.entry_date >= m.m_start
          AND b.entry_date <  (m.m_start + interval '1 month')::date
          AND b.account_number BETWEEN '4000' AND '4999'
      ), 0) AS cogs,
      COALESCE(SUM(b.debit - b.credit) FILTER (
        WHERE b.entry_date >= m.m_start
          AND b.entry_date <  (m.m_start + interval '1 month')::date
          AND b.account_number BETWEEN '5000' AND '7999'
      ), 0) AS opex,
      COALESCE(SUM(b.debit - b.credit) FILTER (
        WHERE b.entry_date < (m.m_start + interval '1 month')::date
          AND b.account_number BETWEEN '1910' AND '1949'
      ), 0) AS cash,
      COALESCE(SUM(b.debit - b.credit) FILTER (
        WHERE b.entry_date < (m.m_start + interval '1 month')::date
          AND b.account_number BETWEEN '1500' AND '1599'
      ), 0) AS ar,
      COALESCE(SUM(b.credit - b.debit) FILTER (
        WHERE b.entry_date < (m.m_start + interval '1 month')::date
          AND b.account_number BETWEEN '2440' AND '2449'
      ), 0) AS ap
    FROM months m LEFT JOIN base b ON TRUE
    GROUP BY m.m_start
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'month',   to_char(m_start, 'Mon'),
      'm_start', m_start,
      'revenue', rev,
      'cogs',    cogs,
      'opex',    opex,
      'result',  rev - cogs - opex,
      'margin',  CASE WHEN rev > 0 THEN ((rev - cogs) / rev) * 100 ELSE 0 END,
      'cash',    cash,
      'ar',      ar,
      'ap',      ap
    ) ORDER BY m_start
  )
  INTO v_spark
  FROM per_month;

  RETURN jsonb_build_object(
    'revenue',          v_revenue,
    'cogs',             v_cogs,
    'opex',             v_opex,
    'result',           v_revenue - v_cogs - v_opex,
    'prev_revenue',     v_prev_revenue,
    'prev_cogs',        v_prev_cogs,
    'prev_opex',        v_prev_opex,
    'prev_result',      v_prev_revenue - v_prev_cogs - v_prev_opex,
    'liquid_cash',      v_cash,
    'prev_liquid_cash', v_prev_cash,
    'ar',               v_ar,
    'prev_ar',          v_prev_ar,
    'ap',               v_ap,
    'prev_ap',          v_prev_ap,
    'spark',            COALESCE(v_spark, '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.dashboard_kpis(uuid, date, date, date, date) FROM public;
GRANT EXECUTE ON FUNCTION public.dashboard_kpis(uuid, date, date, date, date) TO authenticated, service_role;
