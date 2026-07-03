CREATE OR REPLACE FUNCTION public.get_bureau_client_financials(_company_id uuid)
RETURNS TABLE (
  current_month_revenue numeric,
  current_month_costs numeric,
  current_month_result numeric,
  cash_balance numeric,
  gross_margin_pct numeric,
  accounts_receivable_amount numeric,
  accounts_payable_amount numeric,
  dso_days integer,
  output_vat numeric,
  input_vat numeric,
  vat_next_deadline date,
  vat_amount_due numeric,
  overdue_customer_invoices_count integer,
  overdue_customer_invoices_amount numeric,
  overdue_supplier_invoices_count integer,
  overdue_supplier_invoices_amount numeric,
  missing_receipts_count integer,
  unreconciled_transactions integer,
  last_bookkeeping_date date,
  annual_revenue_12m numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _month_start date := date_trunc('month', current_date)::date;
  _month_end date := (date_trunc('month', current_date) + interval '1 month - 1 day')::date;
  _year_start date := (current_date - interval '1 year')::date;
BEGIN
  IF NOT (
    public.has_company_access(auth.uid(), _company_id)
    OR public.can_read_bureau_client_company(auth.uid(), _company_id)
    OR public.is_platform_admin(auth.uid())
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH ledger AS (
    SELECT
      coa.account_number,
      je.entry_date,
      COALESCE(jel.debit, 0)::numeric AS debit,
      COALESCE(jel.credit, 0)::numeric AS credit
    FROM public.journal_entry_lines jel
    JOIN public.journal_entries je ON je.id = jel.journal_entry_id
    JOIN public.chart_of_accounts coa ON coa.id = jel.account_id
    WHERE je.company_id = _company_id
      AND coa.company_id = _company_id
      AND je.status IN ('approved'::journal_status, 'posted'::journal_status)
  ), sums AS (
    SELECT
      COALESCE(SUM(credit - debit) FILTER (WHERE account_number BETWEEN '3000' AND '3999' AND entry_date BETWEEN _month_start AND _month_end), 0) AS revenue_mtd,
      COALESCE(SUM(debit - credit) FILTER (WHERE account_number BETWEEN '4000' AND '7999' AND entry_date BETWEEN _month_start AND _month_end), 0) AS costs_mtd,
      COALESCE(SUM(debit - credit) FILTER (WHERE account_number BETWEEN '1910' AND '1949' AND entry_date <= _month_end), 0) AS cash_balance,
      COALESCE(SUM(debit - credit) FILTER (WHERE account_number BETWEEN '1500' AND '1599' AND entry_date <= _month_end), 0) AS ar_balance,
      COALESCE(SUM(credit - debit) FILTER (WHERE account_number BETWEEN '2440' AND '2449' AND entry_date <= _month_end), 0) AS ap_balance,
      COALESCE(SUM(credit - debit) FILTER (WHERE account_number BETWEEN '2610' AND '2639' AND entry_date BETWEEN _month_start AND _month_end), 0) AS output_vat,
      COALESCE(SUM(debit - credit) FILTER (WHERE account_number BETWEEN '2640' AND '2649' AND entry_date BETWEEN _month_start AND _month_end), 0) AS input_vat,
      COALESCE(SUM(credit - debit) FILTER (WHERE account_number BETWEEN '3000' AND '3999' AND entry_date BETWEEN _year_start AND current_date), 0) AS revenue_12m,
      MAX(entry_date) AS last_entry_date
    FROM ledger
  ), overdue_ar AS (
    SELECT COUNT(*)::integer AS cnt, COALESCE(SUM(total_amount), 0)::numeric AS amount
    FROM public.invoices
    WHERE company_id = _company_id
      AND invoice_direction = 'outgoing'
      AND due_date < current_date
      AND status NOT IN ('paid'::invoice_status, 'cancelled'::invoice_status, 'credited'::invoice_status)
      AND paid_at IS NULL
  ), overdue_ap AS (
    SELECT COUNT(*)::integer AS cnt, COALESCE(SUM(total_amount), 0)::numeric AS amount
    FROM public.invoices
    WHERE company_id = _company_id
      AND invoice_direction = 'incoming'
      AND due_date < current_date
      AND status NOT IN ('paid'::invoice_status, 'cancelled'::invoice_status, 'credited'::invoice_status)
  ), missing AS (
    SELECT COUNT(*)::integer AS cnt
    FROM public.journal_entries
    WHERE company_id = _company_id
      AND document_id IS NULL
      AND status IN ('approved'::journal_status, 'draft'::journal_status, 'pending_approval'::journal_status, 'posted'::journal_status)
  ), bank AS (
    SELECT COUNT(*)::integer AS cnt
    FROM public.bank_transactions
    WHERE company_id = _company_id
      AND status = 'pending'
  ), dso AS (
    SELECT COALESCE(ROUND(AVG(GREATEST(0, paid_at::date - invoice_date::date))), 0)::integer AS days
    FROM public.invoices
    WHERE company_id = _company_id
      AND status = 'paid'::invoice_status
      AND paid_at IS NOT NULL
      AND invoice_date IS NOT NULL
  ), vat_deadline AS (
    SELECT CASE
      WHEN period_month IS NOT NULL THEN make_date(period_year, period_month, 1) + interval '1 month - 1 day'
      WHEN period_quarter IS NOT NULL THEN make_date(period_year, period_quarter * 3, 1) + interval '1 month - 1 day'
      ELSE make_date(period_year, 12, 31)::timestamp
    END::date AS period_end
    FROM public.vat_declarations
    WHERE company_id = _company_id
      AND status IN ('draft', 'calculated', 'approved', 'pending_approval')
    ORDER BY period_end ASC
    LIMIT 1
  )
  SELECT
    s.revenue_mtd,
    s.costs_mtd,
    s.revenue_mtd - s.costs_mtd,
    s.cash_balance,
    CASE WHEN s.revenue_mtd > 0 THEN ROUND(((s.revenue_mtd - s.costs_mtd) / s.revenue_mtd) * 100) ELSE 0 END,
    s.ar_balance,
    s.ap_balance,
    d.days,
    s.output_vat,
    s.input_vat,
    vd.period_end,
    s.output_vat - s.input_vat,
    oa.cnt,
    oa.amount,
    op.cnt,
    op.amount,
    m.cnt,
    b.cnt,
    s.last_entry_date,
    s.revenue_12m
  FROM sums s
  CROSS JOIN overdue_ar oa
  CROSS JOIN overdue_ap op
  CROSS JOIN missing m
  CROSS JOIN bank b
  CROSS JOIN dso d
  LEFT JOIN vat_deadline vd ON true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_bureau_client_financials(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_bureau_client_financials(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_bureau_client_financials(uuid) TO authenticated;