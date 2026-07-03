import { supabase } from "@/integrations/supabase/client";

/**
 * Bureau-side aggregation service.
 *
 * For each client company linked to the bureau, fetches and aggregates a
 * compact summary used by KPI cards, client tables, and realtime panels.
 *
 * Single-Supabase-project model: bureau_members read client data via the
 * existing RLS policies (firm_clients → companies). No raw rows leave this
 * module — only aggregates.
 */

export interface BureauClientFinancials {
  current_month_revenue: number;
  current_month_costs: number;
  current_month_result: number;
  cash_balance: number;
  gross_margin_pct: number;
  accounts_receivable_amount: number;
  accounts_payable_amount: number;
  dso_days: number;
  output_vat: number;
  input_vat: number;
  vat_next_deadline: string | null;
  vat_amount_due: number;
  overdue_customer_invoices_count: number;
  overdue_customer_invoices_amount: number;
  overdue_supplier_invoices_count: number;
  overdue_supplier_invoices_amount: number;
  missing_receipts_count: number;
  unreconciled_transactions: number;
  last_bookkeeping_date: string | null;
  annual_revenue_12m: number;
}

export interface BureauClientHR {
  pending_payroll_approval: number;
  next_agi_deadline: string | null;
  active_employees: number;
}

export interface BureauClientMetadata {
  assigned_accountant_id: string | null;
  client_status: "active" | "watch" | "paused" | "onboarding";
  monthly_fee: number;
  time_spent_this_month: number;
  last_bureau_action: string | null;
  next_deliverable: string | null;
}

export interface BureauClientSummary
  extends BureauClientFinancials,
    BureauClientHR,
    BureauClientMetadata {
  company_id: string;
  company_name: string;
  org_number: string;
}

const safeNum = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);

interface FinancialRpcRow {
  current_month_revenue: number | string | null;
  current_month_costs: number | string | null;
  current_month_result: number | string | null;
  cash_balance: number | string | null;
  gross_margin_pct: number | string | null;
  accounts_receivable_amount: number | string | null;
  accounts_payable_amount: number | string | null;
  dso_days: number | string | null;
  output_vat: number | string | null;
  input_vat: number | string | null;
  vat_next_deadline: string | null;
  vat_amount_due: number | string | null;
  overdue_customer_invoices_count: number | string | null;
  overdue_customer_invoices_amount: number | string | null;
  overdue_supplier_invoices_count: number | string | null;
  overdue_supplier_invoices_amount: number | string | null;
  missing_receipts_count: number | string | null;
  unreconciled_transactions: number | string | null;
  last_bookkeeping_date: string | null;
  annual_revenue_12m: number | string | null;
}

type RpcResult<T> = Promise<{ data: T | null; error: { message: string } | null }>;
const rpc = supabase.rpc as unknown as <T>(fn: string, args: Record<string, unknown>) => RpcResult<T>;

interface DirectLineRow {
  debit: number | string | null;
  credit: number | string | null;
  chart_of_accounts: { account_number: string | null } | { account_number: string | null }[] | null;
}

interface DirectEntryRow {
  entry_date: string | null;
  status: string | null;
  document_id: string | null;
  journal_entry_lines: DirectLineRow[] | null;
}

interface DirectInvoiceRow {
  invoice_direction: string | null;
  status: string | null;
  total_amount: number | string | null;
  due_date: string | null;
  paid_at: string | null;
  invoice_date: string | null;
}

const firstRel = <T,>(value: T | T[] | null | undefined): T | null =>
  Array.isArray(value) ? (value[0] ?? null) : (value ?? null);

const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const inRange = (account: string | null | undefined, from: string, toExclusive: string) =>
  !!account && account >= from && account < toExclusive;

const monthBounds = () => {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  const yearStart = new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), now.getUTCDate()));
  return { monthStart: isoDate(start), monthEnd: isoDate(end), yearStart: isoDate(yearStart), today: isoDate(now) };
};

const emptyFinancials = (): BureauClientFinancials => ({
  current_month_revenue: 0,
  current_month_costs: 0,
  current_month_result: 0,
  cash_balance: 0,
  gross_margin_pct: 0,
  accounts_receivable_amount: 0,
  accounts_payable_amount: 0,
  dso_days: 0,
  output_vat: 0,
  input_vat: 0,
  vat_next_deadline: null,
  vat_amount_due: 0,
  overdue_customer_invoices_count: 0,
  overdue_customer_invoices_amount: 0,
  overdue_supplier_invoices_count: 0,
  overdue_supplier_invoices_amount: 0,
  missing_receipts_count: 0,
  unreconciled_transactions: 0,
  last_bookkeeping_date: null,
  annual_revenue_12m: 0,
});

const emptyHR = (): BureauClientHR => ({
  pending_payroll_approval: 0,
  next_agi_deadline: null,
  active_employees: 0,
});

const emptyMetadata = (): BureauClientMetadata => ({
  assigned_accountant_id: null,
  client_status: "active",
  monthly_fee: 0,
  time_spent_this_month: 0,
  last_bureau_action: null,
  next_deliverable: null,
});

const fromFinancialRpc = (row: FinancialRpcRow): BureauClientFinancials => {
  const n = safeNum;
  return {
    current_month_revenue: n(row.current_month_revenue),
    current_month_costs: n(row.current_month_costs),
    current_month_result: n(row.current_month_result),
    cash_balance: n(row.cash_balance),
    gross_margin_pct: n(row.gross_margin_pct),
    accounts_receivable_amount: n(row.accounts_receivable_amount),
    accounts_payable_amount: n(row.accounts_payable_amount),
    dso_days: n(row.dso_days),
    output_vat: n(row.output_vat),
    input_vat: n(row.input_vat),
    vat_next_deadline: row.vat_next_deadline,
    vat_amount_due: n(row.vat_amount_due),
    overdue_customer_invoices_count: n(row.overdue_customer_invoices_count),
    overdue_customer_invoices_amount: n(row.overdue_customer_invoices_amount),
    overdue_supplier_invoices_count: n(row.overdue_supplier_invoices_count),
    overdue_supplier_invoices_amount: n(row.overdue_supplier_invoices_amount),
    missing_receipts_count: n(row.missing_receipts_count),
    unreconciled_transactions: n(row.unreconciled_transactions),
    last_bookkeeping_date: row.last_bookkeeping_date,
    annual_revenue_12m: n(row.annual_revenue_12m),
  };
};

async function fetchFinancials(companyId: string): Promise<BureauClientFinancials> {
  try {
    const { data, error } = await rpc<FinancialRpcRow[]>("get_bureau_client_financials", { _company_id: companyId });
    if (error) throw new Error(`client financials RPC: ${error.message}`);
    if (data?.[0]) return fromFinancialRpc(data[0]);
    throw new Error("client financials RPC returned no rows");
  } catch (rpcError) {
    console.warn("WL backend ledger aggregation failed, falling back to direct ledger fetch", rpcError);
    return await fetchFinancialsDirectlyFromLedger(companyId);
  }
}

async function fetchFinancialsDirectlyFromLedger(companyId: string): Promise<BureauClientFinancials> {
  const { monthStart, monthEnd, yearStart, today } = monthBounds();

  const [entriesRes, invoicesRes, bankRes] = await Promise.all([
    supabase
      .from("journal_entries")
      .select("entry_date,status,document_id,journal_entry_lines(debit,credit,chart_of_accounts(account_number))")
      .eq("company_id", companyId)
      .in("status", ["approved", "posted"])
      .range(0, 9999),
    supabase
      .from("invoices")
      .select("invoice_direction,status,total_amount,due_date,paid_at,invoice_date")
      .eq("company_id", companyId)
      .range(0, 9999),
    supabase.from("bank_transactions").select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("status", "pending"),
  ]);

  if (entriesRes.error) throw new Error(`direct ledger entries: ${entriesRes.error.message}`);

  const entries = (entriesRes.data ?? []) as unknown as DirectEntryRow[];
  const invoices = ((invoicesRes.data ?? []) as unknown as DirectInvoiceRow[]).filter((i) => !invoicesRes.error && i);
  let revenueMtd = 0;
  let costsMtd = 0;
  let cashBalance = 0;
  let arBalance = 0;
  let apBalance = 0;
  let outputVat = 0;
  let inputVat = 0;
  let revenue12m = 0;
  let lastBookkeepingDate: string | null = null;

  for (const entry of entries) {
    const entryDate = entry.entry_date;
    if (entryDate && (!lastBookkeepingDate || entryDate > lastBookkeepingDate)) lastBookkeepingDate = entryDate;
    for (const line of entry.journal_entry_lines ?? []) {
      const account = firstRel(line.chart_of_accounts)?.account_number ?? null;
      const debit = safeNum(line.debit);
      const credit = safeNum(line.credit);
      if (entryDate && entryDate >= monthStart && entryDate <= monthEnd && inRange(account, "3000", "4000")) revenueMtd += credit - debit;
      if (entryDate && entryDate >= monthStart && entryDate <= monthEnd && inRange(account, "4000", "8000")) costsMtd += debit - credit;
      if (entryDate && entryDate <= monthEnd && inRange(account, "1910", "1950")) cashBalance += debit - credit;
      if (entryDate && entryDate <= monthEnd && inRange(account, "1500", "1600")) arBalance += debit - credit;
      if (entryDate && entryDate <= monthEnd && inRange(account, "2440", "2450")) apBalance += credit - debit;
      if (entryDate && entryDate >= monthStart && entryDate <= monthEnd && inRange(account, "2610", "2640")) outputVat += credit - debit;
      if (entryDate && entryDate >= monthStart && entryDate <= monthEnd && inRange(account, "2640", "2650")) inputVat += debit - credit;
      if (entryDate && entryDate >= yearStart && entryDate <= today && inRange(account, "3000", "4000")) revenue12m += credit - debit;
    }
  }

  const unpaid = (s: string | null) => s !== "paid" && s !== "cancelled" && s !== "credited";
  const overdueOutgoing = invoices.filter((i) => i.invoice_direction === "outgoing" && unpaid(i.status) && !i.paid_at && !!i.due_date && i.due_date < today);
  const overdueIncoming = invoices.filter((i) => i.invoice_direction === "incoming" && unpaid(i.status) && !!i.due_date && i.due_date < today);
  const paidDays = invoices
    .filter((i) => i.status === "paid" && i.paid_at && i.invoice_date)
    .map((i) => Math.max(0, Math.round((new Date(i.paid_at!).getTime() - new Date(i.invoice_date!).getTime()) / 86_400_000)));

  return {
    current_month_revenue: Math.round(revenueMtd),
    current_month_costs: Math.round(costsMtd),
    current_month_result: Math.round(revenueMtd - costsMtd),
    cash_balance: Math.round(cashBalance),
    gross_margin_pct: revenueMtd > 0 ? Math.round(((revenueMtd - costsMtd) / revenueMtd) * 100) : 0,
    accounts_receivable_amount: Math.round(arBalance),
    accounts_payable_amount: Math.round(apBalance),
    dso_days: paidDays.length ? Math.round(paidDays.reduce((a, b) => a + b, 0) / paidDays.length) : 0,
    output_vat: Math.round(outputVat),
    input_vat: Math.round(inputVat),
    vat_next_deadline: null,
    vat_amount_due: Math.round(outputVat - inputVat),
    overdue_customer_invoices_count: overdueOutgoing.length,
    overdue_customer_invoices_amount: Math.round(overdueOutgoing.reduce((sum, i) => sum + safeNum(i.total_amount), 0)),
    overdue_supplier_invoices_count: overdueIncoming.length,
    overdue_supplier_invoices_amount: Math.round(overdueIncoming.reduce((sum, i) => sum + safeNum(i.total_amount), 0)),
    missing_receipts_count: entries.filter((e) => !e.document_id).length,
    unreconciled_transactions: bankRes.error ? 0 : (bankRes.count ?? 0),
    last_bookkeeping_date: lastBookkeepingDate,
    annual_revenue_12m: Math.round(revenue12m),
  };
}

async function fetchHR(companyId: string): Promise<BureauClientHR> {
  const [employees, payroll, agi] = await Promise.all([
    supabase
      .from("employees")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("is_active", true),
    supabase
      .from("hr_events" as never)
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("status", "pending"),
    supabase
      .from("agi_submissions" as never)
      .select("period_end")
      .eq("company_id", companyId)
      .gte("period_end", new Date().toISOString().slice(0, 10))
      .order("period_end", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  const hrError = employees.error ?? payroll.error ?? agi.error;
  if (hrError) throw new Error(`client HR: ${hrError.message}`);

  return {
    active_employees: employees.count ?? 0,
    pending_payroll_approval: (payroll as any).count ?? 0,
    next_agi_deadline: ((agi as any).data?.period_end as string | undefined) ?? null,
  };
}

async function fetchMetadata(
  firmId: string,
  companyId: string,
): Promise<BureauClientMetadata> {
  const { data, error } = await supabase
    .from("firm_clients")
    .select(
      "assigned_consultant_id, mandate_status, monthly_fee, updated_at",
    )
    .eq("firm_id", firmId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (error) throw new Error(`firm_clients metadata: ${error.message}`);

  const row = (data ?? {}) as Record<string, unknown>;
  const status = (row.mandate_status as string) ?? "active";
  return {
    assigned_accountant_id: (row.assigned_consultant_id as string) ?? null,
    client_status:
      status === "watch" || status === "paused" || status === "onboarding"
        ? (status as BureauClientMetadata["client_status"])
        : "active",
    monthly_fee: safeNum(row.monthly_fee),
    time_spent_this_month: 0, // filled by time-tracking module when available
    last_bureau_action: (row.updated_at as string) ?? null,
    next_deliverable: null,
  };
}

export async function fetchBureauClientSummary(
  firmId: string,
  company: { id: string; name: string; org_number: string },
): Promise<BureauClientSummary> {
  const [finResult, hrResult, metaResult] = await Promise.allSettled([
    fetchFinancials(company.id),
    fetchHR(company.id),
    fetchMetadata(firmId, company.id),
  ]);
  if (finResult.status === "rejected") throw finResult.reason;
  const fin = finResult.value;
  const hr = hrResult.status === "fulfilled" ? hrResult.value : emptyHR();
  const meta = metaResult.status === "fulfilled" ? metaResult.value : emptyMetadata();

  return {
    company_id: company.id,
    company_name: company.name,
    org_number: company.org_number,
    current_month_revenue: 0,
    current_month_costs: 0,
    current_month_result: 0,
    cash_balance: 0,
    gross_margin_pct: 0,
    accounts_receivable_amount: 0,
    accounts_payable_amount: 0,
    dso_days: 0,
    output_vat: 0,
    input_vat: 0,
    vat_next_deadline: null,
    vat_amount_due: 0,
    overdue_customer_invoices_count: 0,
    overdue_customer_invoices_amount: 0,
    overdue_supplier_invoices_count: 0,
    overdue_supplier_invoices_amount: 0,
    missing_receipts_count: 0,
    unreconciled_transactions: 0,
    last_bookkeeping_date: null,
    annual_revenue_12m: 0,
    pending_payroll_approval: 0,
    next_agi_deadline: null,
    active_employees: 0,
    assigned_accountant_id: null,
    client_status: "active",
    monthly_fee: 0,
    time_spent_this_month: 0,
    last_bureau_action: null,
    next_deliverable: null,
    ...fin,
    ...hr,
    ...meta,
  };
}

export async function fetchAllBureauClientSummaries(
  firmId: string,
  companies: Array<{ id: string; name: string; org_number: string }>,
): Promise<BureauClientSummary[]> {
  if (!firmId || companies.length === 0) return [];
  return Promise.all(companies.map((c) => fetchBureauClientSummary(firmId, c)));
}
