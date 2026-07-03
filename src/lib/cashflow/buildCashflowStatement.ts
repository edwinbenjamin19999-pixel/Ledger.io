/**
 * Build a Swedish accounting-grade Cash Flow Statement (Kassaflödesanalys)
 * via the **direct method** from journal_entry_lines.
 *
 * Approach:
 *   1. For each journal entry, identify the cash side (accounts 1910–1950).
 *   2. Compute net cash delta (debit - credit) on cash accounts.
 *   3. Bucket the entry into a category by inspecting the COUNTER accounts
 *      present in the same entry (highest-weight non-cash account).
 *   4. Aggregate per category for [period, prior period, YTD].
 *   5. Compute opening / closing cash from balance sums.
 *
 * Returns a StatementDocument that is consumable directly by the existing
 * premium PDF + XLSX renderers.
 */
import { format as formatDate } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import type { StatementDocument, StatementRow } from "@/lib/reports/statementDocument";

// ── Account ranges ───────────────────────────────────────────────────
const isCashAccount = (n: string) => {
  const x = parseInt(n, 10);
  return x >= 1910 && x <= 1959;
};
const inRange = (n: string, lo: number, hi: number) => {
  const x = parseInt(n, 10);
  return x >= lo && x <= hi;
};

// ── Categories ───────────────────────────────────────────────────────
type Category =
  | "customer_in"
  | "supplier_out"
  | "payroll_out"
  | "other_op_out"
  | "tax_out"
  | "asset_invest"
  | "fin_invest"
  | "divest"
  | "loans"
  | "equity";

interface CatRow {
  key: Category;
  label: string;
  section: "OPERATING" | "INVESTING" | "FINANCING";
  /** Code shown in the "Konto" column. */
  code: string;
}

const CATEGORIES: CatRow[] = [
  { key: "customer_in",  label: "Inbetalningar från kunder",                section: "OPERATING",  code: "1510" },
  { key: "supplier_out", label: "Utbetalningar till leverantörer",          section: "OPERATING",  code: "2440" },
  { key: "payroll_out",  label: "Utbetalningar till anställda (löner)",     section: "OPERATING",  code: "7xxx" },
  { key: "other_op_out", label: "Övriga rörelseutbetalningar",              section: "OPERATING",  code: "5–6" },
  { key: "tax_out",      label: "Betald inkomstskatt",                      section: "OPERATING",  code: "251x" },
  { key: "asset_invest", label: "Förvärv av materiella anläggningstillgångar", section: "INVESTING",  code: "11xx" },
  { key: "fin_invest",   label: "Förvärv av finansiella tillgångar",        section: "INVESTING",  code: "13xx" },
  { key: "divest",       label: "Avyttringar",                              section: "INVESTING",  code: "—" },
  { key: "loans",        label: "Upptagna lån / Amorteringar",              section: "FINANCING",  code: "23xx" },
  { key: "equity",       label: "Nyemission / Utdelning",                   section: "FINANCING",  code: "20xx" },
];

// ── Categorisation logic ─────────────────────────────────────────────
//
// For a given counter-account number, decide which category it implies.
// First match wins; "other_op_out" is the operating fallback.
function categorise(counterAccount: string, cashDelta: number): Category {
  const n = parseInt(counterAccount, 10);
  if (!Number.isFinite(n)) return "other_op_out";

  // Investing
  if (n >= 1100 && n <= 1299) return "asset_invest";   // materiella
  if (n >= 1300 && n <= 1399) return "fin_invest";     // finansiella

  // Financing
  if (n >= 2300 && n <= 2399) return "loans";
  if (n >= 2000 && n <= 2099) return "equity";

  // Tax
  if (n === 2510 || n === 2512 || n === 2518 || (n >= 8910 && n <= 8929)) return "tax_out";

  // AR / Revenue → customer in
  if (n === 1510 || n === 1515 || (n >= 3000 && n <= 3999)) return "customer_in";

  // AP → supplier
  if (n === 2440) return "supplier_out";

  // Payroll
  if (n >= 7000 && n <= 7999) return "payroll_out";

  // Operating costs (inköp, övriga)
  if (n >= 4000 && n <= 6999) {
    return cashDelta > 0 ? "customer_in" : "other_op_out";
  }

  return cashDelta > 0 ? "customer_in" : "other_op_out";
}

// ── Internal types ───────────────────────────────────────────────────
interface RawLine {
  debit: number;
  credit: number;
  account_number: string;
  account_name: string;
  entry_id: string;
  entry_date: string;
}

interface JournalEntryRow {
  id: string;
  entry_date: string;
  journal_entry_lines: Array<{
    debit: number | null;
    credit: number | null;
    chart_of_accounts: { account_number: string; account_name: string } | null;
  }>;
}

export interface CashflowDrillRow {
  entryId: string;
  entryDate: string;
  description?: string;
  cashDelta: number;
  counterAccount: string;
  counterAccountName?: string;
}

export interface CashflowStatementResult {
  doc: StatementDocument;
  /** Drilldown data keyed by category — used by the drilldown drawer. */
  drilldown: Record<Category, CashflowDrillRow[]>;
  /** Compact summary numbers for the top strip. */
  summary: {
    inflows: number;
    outflows: number;
    net: number;
    openingCash: number;
    closingCash: number;
    priorNet: number;
  };
  categoriesByKey: Record<Category, CatRow>;
}

// ── Fetch helpers ────────────────────────────────────────────────────
async function fetchEntries(
  companyId: string,
  fromDate: Date,
  toDate: Date,
): Promise<RawLine[]> {
  const out: RawLine[] = [];
  const PAGE = 1000;
  let offset = 0;
  let more = true;
  while (more) {
    const { data, error } = await supabase
      .from("journal_entries")
      .select(
        `id, entry_date, journal_entry_lines (debit, credit, chart_of_accounts (account_number, account_name))`,
      )
      .eq("company_id", companyId)
      .in("status", ["approved", "posted"])
      .gte("entry_date", formatDate(fromDate, "yyyy-MM-dd"))
      .lte("entry_date", formatDate(toDate, "yyyy-MM-dd"))
      .range(offset, offset + PAGE - 1);
    if (error) throw error;
    const rows = (data || []) as JournalEntryRow[];
    for (const e of rows) {
      for (const l of e.journal_entry_lines || []) {
        const acc = l.chart_of_accounts;
        if (!acc) continue;
        out.push({
          debit: Number(l.debit) || 0,
          credit: Number(l.credit) || 0,
          account_number: acc.account_number,
          account_name: acc.account_name,
          entry_id: e.id,
          entry_date: e.entry_date,
        });
      }
    }
    more = rows.length >= PAGE;
    offset += PAGE;
  }
  return out;
}

async function fetchOpeningCash(companyId: string, before: Date): Promise<number> {
  // Sum (debit - credit) on cash accounts up to (exclusive of) `before`.
  const { data, error } = await supabase
    .from("journal_entries")
    .select(
      `entry_date, journal_entry_lines (debit, credit, chart_of_accounts (account_number))`,
    )
    .eq("company_id", companyId)
    .in("status", ["approved", "posted"])
    .lt("entry_date", formatDate(before, "yyyy-MM-dd"));
  if (error) throw error;
  let sum = 0;
  for (const e of (data || []) as JournalEntryRow[]) {
    for (const l of e.journal_entry_lines || []) {
      const num = l.chart_of_accounts?.account_number;
      if (!num || !isCashAccount(num)) continue;
      sum += (Number(l.debit) || 0) - (Number(l.credit) || 0);
    }
  }
  return sum;
}

// ── Aggregation core ─────────────────────────────────────────────────
function aggregate(
  lines: RawLine[],
): { perCat: Map<Category, number>; perCatDrill: Map<Category, CashflowDrillRow[]> } {
  // Group by entry_id
  const byEntry = new Map<string, RawLine[]>();
  for (const l of lines) {
    if (!byEntry.has(l.entry_id)) byEntry.set(l.entry_id, []);
    byEntry.get(l.entry_id)!.push(l);
  }

  const perCat = new Map<Category, number>();
  const perCatDrill = new Map<Category, CashflowDrillRow[]>();
  const bump = (k: Category, v: number) => perCat.set(k, (perCat.get(k) || 0) + v);
  const drill = (k: Category, r: CashflowDrillRow) => {
    if (!perCatDrill.has(k)) perCatDrill.set(k, []);
    perCatDrill.get(k)!.push(r);
  };

  for (const [entryId, ls] of byEntry) {
    const cashLines = ls.filter((l) => isCashAccount(l.account_number));
    if (cashLines.length === 0) continue;
    const cashDelta = cashLines.reduce((s, l) => s + l.debit - l.credit, 0);
    if (Math.abs(cashDelta) < 0.005) continue;

    // Find the dominant counter-account (largest absolute non-cash movement).
    const counters = ls.filter((l) => !isCashAccount(l.account_number));
    if (counters.length === 0) continue;
    const dominant = counters.reduce((best, l) => {
      const w = Math.abs(l.debit - l.credit);
      const bw = Math.abs(best.debit - best.credit);
      return w > bw ? l : best;
    }, counters[0]);

    const cat = categorise(dominant.account_number, cashDelta);
    bump(cat, cashDelta);
    drill(cat, {
      entryId,
      entryDate: ls[0].entry_date,
      cashDelta,
      counterAccount: dominant.account_number,
      counterAccountName: dominant.account_name,
    });
  }

  return { perCat, perCatDrill };
}

// ── Public entry point ───────────────────────────────────────────────
export interface BuildCashflowInput {
  companyId: string;
  companyName: string;
  fromDate: Date;
  toDate: Date;
  /** For YTD column. If omitted, fiscal year is Jan 1 of `toDate.year`. */
  ytdFromDate?: Date;
}

const fmtPeriod = (a: Date, b: Date) =>
  `${formatDate(a, "yyyy-MM-dd")} – ${formatDate(b, "yyyy-MM-dd")}`;

export async function buildCashflowStatement(
  input: BuildCashflowInput,
): Promise<CashflowStatementResult> {
  const { companyId, companyName, fromDate, toDate } = input;

  // Prior period of same length, ending the day before fromDate.
  const periodMs = toDate.getTime() - fromDate.getTime();
  const priorTo = new Date(fromDate.getTime() - 86_400_000);
  const priorFrom = new Date(priorTo.getTime() - periodMs);

  const ytdFrom = input.ytdFromDate ?? new Date(toDate.getFullYear(), 0, 1);

  const [periodLines, priorLines, ytdLines, openingCash] = await Promise.all([
    fetchEntries(companyId, fromDate, toDate),
    fetchEntries(companyId, priorFrom, priorTo),
    fetchEntries(companyId, ytdFrom, toDate),
    fetchOpeningCash(companyId, fromDate),
  ]);

  const period = aggregate(periodLines);
  const prior = aggregate(priorLines);
  const ytd = aggregate(ytdLines);

  const closingCash =
    openingCash + Array.from(period.perCat.values()).reduce((s, v) => s + v, 0);

  // Build StatementDocument rows
  const rows: StatementRow[] = [];
  const sectionsOrder: Array<"OPERATING" | "INVESTING" | "FINANCING"> = [
    "OPERATING",
    "INVESTING",
    "FINANCING",
  ];
  const sectionLabel: Record<string, string> = {
    OPERATING: "DEN LÖPANDE VERKSAMHETEN",
    INVESTING: "INVESTERINGSVERKSAMHETEN",
    FINANCING: "FINANSIERINGSVERKSAMHETEN",
  };
  const subtotalLabel: Record<string, string> = {
    OPERATING: "Kassaflöde från löpande verksamhet",
    INVESTING: "Kassaflöde från investeringsverksamhet",
    FINANCING: "Kassaflöde från finansieringsverksamhet",
  };

  // Helpers: build the 6-value array expected by the renderer
  // [perioden, ingBalans (period prior), utgSaldo (YTD), budget (NaN), varKr, varPct]
  const buildValues = (cat: Category): number[] => {
    const p = period.perCat.get(cat) || 0;
    const pr = prior.perCat.get(cat) || 0;
    const y = ytd.perCat.get(cat) || 0;
    const varKr = p - pr;
    const varPct = pr !== 0 ? varKr / Math.abs(pr) : NaN;
    return [p, pr, y, NaN, varKr, varPct];
  };

  const sumValues = (vals: number[][]): number[] => {
    const out = [0, 0, 0, NaN, 0, NaN];
    for (const v of vals) {
      out[0] += v[0] || 0;
      out[1] += v[1] || 0;
      out[2] += v[2] || 0;
      out[4] += v[4] || 0;
    }
    if (out[1] !== 0) out[5] = out[4] / Math.abs(out[1]);
    return out;
  };

  const sectionSubtotals: Record<string, number[]> = {};

  for (const sec of sectionsOrder) {
    rows.push({ kind: "section", label: sectionLabel[sec] });
    const cats = CATEGORIES.filter((c) => c.section === sec);
    const vals: number[][] = [];
    for (const c of cats) {
      const v = buildValues(c.key);
      vals.push(v);
      rows.push({ kind: "account", code: c.code, label: c.label, values: v });
    }
    const sub = sumValues(vals);
    sectionSubtotals[sec] = sub;
    rows.push({ kind: "subtotal", label: subtotalLabel[sec], values: sub });
    rows.push({ kind: "spacer" });
  }

  // ÅRETS KASSAFLÖDE = sum of three subtotals
  const grand = sumValues(sectionsOrder.map((s) => sectionSubtotals[s]));
  rows.push({ kind: "total", label: "ÅRETS KASSAFLÖDE", values: grand });

  // Opening / closing cash rows (use IB column to show opening, UB column for closing).
  rows.push({
    kind: "account",
    code: "1910",
    label: "Likvida medel vid periodens början",
    values: [openingCash, openingCash, openingCash, NaN, NaN, NaN],
  });
  rows.push({
    kind: "account",
    code: "1910",
    label: "Likvida medel vid periodens slut",
    values: [closingCash, closingCash, closingCash, NaN, NaN, NaN],
  });

  // ── Build StatementDocument ──
  const doc: StatementDocument = {
    header: {
      company: companyName,
      title: "Kassaflödesanalys",
      period: fmtPeriod(fromDate, toDate),
      generated: new Date(),
    },
    columns: [
      { key: "code",    label: "Konto",            align: "left",  format: "text",   width: 8 },
      { key: "label",   label: "Benämning",        align: "left",  format: "text",   width: 42 },
      { key: "period",  label: "Perioden",         align: "right", format: "number", width: 14 },
      { key: "prior",   label: "Föregående",       align: "right", format: "number", width: 14 },
      { key: "ytd",     label: "YTD",              align: "right", format: "number", width: 14 },
      { key: "budget",  label: "—",                align: "right", format: "number", width: 12 },
      { key: "varKr",   label: "Avvik. kr",        align: "right", format: "number", width: 10 },
      { key: "varPct",  label: "%",                align: "right", format: "percent", width: 8 },
    ],
    rows,
    warnings: [],
    footer: { confidentiality: "Konfidentiellt · Endast för internt bruk" },
  };

  // Build drilldown record with all categories present
  const drilldown = {} as Record<Category, CashflowDrillRow[]>;
  for (const c of CATEGORIES) {
    drilldown[c.key] = period.perCatDrill.get(c.key) || [];
  }
  const categoriesByKey = {} as Record<Category, CatRow>;
  for (const c of CATEGORIES) categoriesByKey[c.key] = c;

  const inflows = Array.from(period.perCat.values())
    .filter((v) => v > 0)
    .reduce((s, v) => s + v, 0);
  const outflows = Array.from(period.perCat.values())
    .filter((v) => v < 0)
    .reduce((s, v) => s + v, 0);
  const net = inflows + outflows;
  const priorNet = Array.from(prior.perCat.values()).reduce((s, v) => s + v, 0);

  return {
    doc,
    drilldown,
    summary: { inflows, outflows, net, openingCash, closingCash, priorNet },
    categoriesByKey,
  };
}

export type { Category as CashflowCategory };
