/**
 * Build a Swedish accounting-grade Cash Flow Statement (Kassaflödesanalys)
 * via the **indirect method** — the standard for Swedish annual reports
 * (BFNAR 2012:1 K3 / BFNAR 2016:10 K2).
 *
 * Approach:
 *   1. Compute "Årets resultat" from P&L accounts in the period
 *      (3xxx revenue + 4xxx-8xxx costs).
 *   2. Add back non-cash items (depreciation 78xx).
 *   3. Apply working-capital deltas using opening vs closing balances
 *      on AR (15xx), Inventory (14xx), AP (24xx) and other current items.
 *   4. Compute investing & financing flows from balance deltas on
 *      fixed-asset accounts (10xx-13xx) and equity/loan accounts
 *      (20xx, 23xx).
 *   5. Reconcile against actual cash movement on 1910-1959.
 *
 * Returns the same `CashflowStatementResult` shape as the direct builder
 * so the hook, page, drilldown and exports work unchanged.
 */
import { format as formatDate } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import type { StatementDocument, StatementRow } from "@/lib/reports/statementDocument";
import type {
  CashflowStatementResult,
  CashflowCategory,
  CashflowDrillRow,
  BuildCashflowInput,
} from "./buildCashflowStatement";
import { getNetResult } from "@/lib/finance/getNetResult";

// Categories used by the page's drilldown drawer. We reuse the same
// enum so the existing drawer/page works without changes; for the
// indirect method we only populate a subset of buckets.
const CATEGORIES_BY_KEY: Record<CashflowCategory, { key: CashflowCategory; label: string; section: "OPERATING" | "INVESTING" | "FINANCING"; code: string }> = {
  customer_in:  { key: "customer_in",  label: "Förändring kundfordringar",       section: "OPERATING",  code: "15xx" },
  supplier_out: { key: "supplier_out", label: "Förändring leverantörsskulder",   section: "OPERATING",  code: "24xx" },
  payroll_out:  { key: "payroll_out",  label: "Förändring personalrelaterade",   section: "OPERATING",  code: "27xx" },
  other_op_out: { key: "other_op_out", label: "Förändring övriga rörelseposter", section: "OPERATING",  code: "16-29" },
  tax_out:      { key: "tax_out",      label: "Betald inkomstskatt",             section: "OPERATING",  code: "251x" },
  asset_invest: { key: "asset_invest", label: "Förvärv/avyttring anl.tillgångar", section: "INVESTING",  code: "11-12" },
  fin_invest:   { key: "fin_invest",   label: "Förvärv/avyttring fin. tillgångar", section: "INVESTING",  code: "13xx" },
  divest:       { key: "divest",       label: "Avyttringar",                     section: "INVESTING",  code: "—" },
  loans:        { key: "loans",        label: "Upptagna/amorterade lån",         section: "FINANCING",  code: "23xx" },
  equity:       { key: "equity",       label: "Nyemission / utdelning",          section: "FINANCING",  code: "20xx" },
};

const isCash = (n: string) => {
  const x = parseInt(n, 10);
  return x >= 1910 && x <= 1959;
};

interface RawLine {
  debit: number;
  credit: number;
  account_number: string;
  account_name: string;
  entry_id: string;
  entry_date: string;
  description?: string;
}

interface JournalEntryRow {
  id: string;
  entry_date: string;
  description?: string | null;
  journal_entry_lines: Array<{
    debit: number | null;
    credit: number | null;
    chart_of_accounts: { account_number: string; account_name: string } | null;
  }>;
}

async function fetchEntries(companyId: string, fromDate: Date, toDate: Date): Promise<RawLine[]> {
  const out: RawLine[] = [];
  const PAGE = 1000;
  let offset = 0;
  let more = true;
  while (more) {
    const { data, error } = await supabase
      .from("journal_entries")
      .select(`id, entry_date, description, journal_entry_lines (debit, credit, chart_of_accounts (account_number, account_name))`)
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
          description: e.description ?? undefined,
        });
      }
    }
    more = rows.length >= PAGE;
    offset += PAGE;
  }
  return out;
}

/** Sum (debit - credit) per account number for all entries strictly before `before`. */
async function fetchBalancesBefore(companyId: string, before: Date): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const PAGE = 1000;
  let offset = 0;
  let more = true;
  while (more) {
    const { data, error } = await supabase
      .from("journal_entries")
      .select(`entry_date, journal_entry_lines (debit, credit, chart_of_accounts (account_number))`)
      .eq("company_id", companyId)
      .in("status", ["approved", "posted"])
      .lt("entry_date", formatDate(before, "yyyy-MM-dd"))
      .range(offset, offset + PAGE - 1);
    if (error) throw error;
    const rows = (data || []) as JournalEntryRow[];
    for (const e of rows) {
      for (const l of e.journal_entry_lines || []) {
        const num = l.chart_of_accounts?.account_number;
        if (!num) continue;
        const delta = (Number(l.debit) || 0) - (Number(l.credit) || 0);
        map.set(num, (map.get(num) || 0) + delta);
      }
    }
    more = rows.length >= PAGE;
    offset += PAGE;
  }
  return map;
}

/** Helper: sum balances over an account-number predicate. */
function sumWhere(balances: Map<string, number>, predicate: (acc: number) => boolean): number {
  let total = 0;
  for (const [num, v] of balances) {
    const x = parseInt(num, 10);
    if (Number.isFinite(x) && predicate(x)) total += v;
  }
  return total;
}

/**
 * Net income — DELEGATES to the canonical `getNetResult()` selector so that
 * Resultat & balans, Kassaflödesanalys och AI CFO alltid visar samma värde
 * och tecken för samma period. Depreciation (77-79xx) extraheras lokalt
 * från periodens lines för cashflow-justeringen.
 */
function computeDepreciation(lines: RawLine[]): number {
  let depreciation = 0;
  for (const l of lines) {
    const n = parseInt(l.account_number, 10);
    if (!Number.isFinite(n)) continue;
    if (n >= 7700 && n <= 7999) {
      depreciation += (l.debit - l.credit);
    }
  }
  return depreciation;
}

const fmtPeriod = (a: Date, b: Date) =>
  `${formatDate(a, "yyyy-MM-dd")} – ${formatDate(b, "yyyy-MM-dd")}`;

const ZERO_VALS = (): number[] => [0, 0, 0, NaN, NaN, NaN];

export async function buildCashflowIndirect(
  input: BuildCashflowInput,
): Promise<CashflowStatementResult> {
  const { companyId, companyName, fromDate, toDate } = input;
  const periodMs = toDate.getTime() - fromDate.getTime();
  const priorTo = new Date(fromDate.getTime() - 86_400_000);
  const priorFrom = new Date(priorTo.getTime() - periodMs);

  const [periodLines, priorLines, openBal, closeBalRaw] = await Promise.all([
    fetchEntries(companyId, fromDate, toDate),
    fetchEntries(companyId, priorFrom, priorTo),
    fetchBalancesBefore(companyId, fromDate),
    fetchBalancesBefore(companyId, new Date(toDate.getTime() + 86_400_000)),
  ]);

  // Closing balances include period; opening does not.
  const closeBal = closeBalRaw;

  // ── Period figures ──
  // Årets resultat hämtas från kanonisk källa (samma som Resultat & balans + AI CFO).
  const nr = await getNetResult(companyId, fromDate, toDate);
  const netIncome = nr.netResult;
  const depreciation = computeDepreciation(periodLines);

  // Working-capital deltas. Asset deltas (debit-positive) → INCREASE = cash outflow.
  // Liability deltas (credit-positive, balance is negative when summed as D-C) → INCREASE in liab = cash inflow.
  const balDelta = (predicate: (n: number) => boolean) =>
    sumWhere(closeBal, predicate) - sumWhere(openBal, predicate);

  const dAR  = balDelta((n) => n >= 1500 && n <= 1599);          // assets ↑ ⇒ outflow
  const dInv = balDelta((n) => n >= 1400 && n <= 1499);          // assets ↑ ⇒ outflow
  const dAP  = balDelta((n) => n >= 2400 && n <= 2499);          // liab balance more negative ⇒ inflow
  const dOtherCurrAssets = balDelta((n) => (n >= 1600 && n <= 1899));
  const dOtherCurrLiab   = balDelta((n) => (n >= 2500 && n <= 2999) && !((n >= 2300 && n <= 2399))); // exclude long-term loans

  // Sign rules:
  //   asset increase  → -delta to cash
  //   liability increase (balance becomes more negative) → -delta to cash flow as well, but
  //     since liability accounts are stored credit-positive (D-C is negative),
  //     "increase in liability" makes balance MORE NEGATIVE, so -(closeBal - openBal)
  //     yields a POSITIVE number = inflow. So both branches use -delta.
  const wcAR             = -dAR;
  const wcInv            = -dInv;
  const wcAP             = -dAP;
  const wcOtherAssets    = -dOtherCurrAssets;
  const wcOtherLiab      = -dOtherCurrLiab;
  const wcOtherCombined  = wcOtherAssets + wcOtherLiab;

  // Investing: -(delta in fixed assets 10xx-13xx)
  const dFixedTang = balDelta((n) => n >= 1100 && n <= 1299);
  const dFixedFin  = balDelta((n) => n >= 1300 && n <= 1399);
  const invTang = -dFixedTang;
  const invFin  = -dFixedFin;

  // Financing: -(delta in equity 20xx) and -(delta in long-term loans 23xx).
  // Equity accounts are credit-positive; new equity / retained earnings make
  // balance more negative → positive inflow (matches sign convention above).
  const dEquity = balDelta((n) => n >= 2000 && n <= 2099);
  const dLoans  = balDelta((n) => n >= 2300 && n <= 2399);
  const finEquity = -dEquity - netIncome; // exclude this period's result already in op-flow
  const finLoans  = -dLoans;

  // Cash anchors
  const openingCash = sumWhere(openBal, (n) => n >= 1910 && n <= 1959);
  const closingCash = sumWhere(closeBal, (n) => n >= 1910 && n <= 1959);

  // ── Build StatementDocument rows ──
  const rows: StatementRow[] = [];

  // Period values are placed in column 0; prior + ytd left as same value
  // so existing renderer/exports show consistent figures (prior=0 if unknown).
  const v = (val: number, prior = 0): number[] => {
    const varKr = val - prior;
    const varPct = prior !== 0 ? varKr / Math.abs(prior) : NaN;
    return [val, prior, val, NaN, varKr, varPct];
  };

  // OPERATING
  rows.push({ kind: "section", label: "DEN LÖPANDE VERKSAMHETEN" });
  rows.push({ kind: "account", code: "8999", label: "Årets resultat",                values: v(netIncome) });
  rows.push({ kind: "group",   label: "Justeringar för poster som inte ingår i kassaflödet" });
  rows.push({ kind: "account", code: "78xx", label: "Avskrivningar",                 values: v(depreciation) });
  const opBeforeWC = netIncome + depreciation;
  rows.push({ kind: "subtotal", label: "Kassaflöde före förändring av rörelsekapital", values: v(opBeforeWC) });
  rows.push({ kind: "spacer" });
  rows.push({ kind: "group",   label: "Förändring i rörelsekapital" });
  rows.push({ kind: "account", code: "15xx", label: "Förändring kundfordringar",       values: v(wcAR) });
  rows.push({ kind: "account", code: "14xx", label: "Förändring lager",               values: v(wcInv) });
  rows.push({ kind: "account", code: "24xx", label: "Förändring leverantörsskulder",  values: v(wcAP) });
  rows.push({ kind: "account", code: "16-29", label: "Förändring övriga kortfristiga poster", values: v(wcOtherCombined) });

  // ── Hard reconciliation to actual cash movement ─────────────────────
  // The cash flow statement MUST satisfy IB + period flow = UB. If the
  // indirect-method derivation drifts (typically when the same underlying
  // posting is reflected in both working capital and financing), we add a
  // single explicit reconciliation row to absorb the difference so the
  // total equals the real cash movement on 19xx.
  // (openingCash / closingCash computed above)
  const cashDelta = closingCash - openingCash;

  const operatingDerived = opBeforeWC + wcAR + wcInv + wcAP + wcOtherCombined;
  const investingDerived = invTang + invFin;
  const financingDerived = finLoans + finEquity;
  const netDerived = operatingDerived + investingDerived + financingDerived;
  const reconcileDiff = cashDelta - netDerived;
  const needsReconcile = Math.abs(reconcileDiff) > 1;

  if (needsReconcile) {
    rows.push({
      kind: "account",
      code: "—",
      label: "Avstämningsjustering mot faktisk kassarörelse",
      values: v(reconcileDiff),
    });
  }
  const operating = operatingDerived + (needsReconcile ? reconcileDiff : 0);
  rows.push({ kind: "subtotal", label: "Kassaflöde från löpande verksamhet", values: v(operating) });
  rows.push({ kind: "spacer" });

  // INVESTING
  rows.push({ kind: "section", label: "INVESTERINGSVERKSAMHETEN" });
  rows.push({ kind: "account", code: "11-12", label: "Förvärv/avyttring materiella anläggningstillgångar", values: v(invTang) });
  rows.push({ kind: "account", code: "13xx",  label: "Förvärv/avyttring finansiella anläggningstillgångar", values: v(invFin) });
  const investing = investingDerived;
  rows.push({ kind: "subtotal", label: "Kassaflöde från investeringsverksamhet", values: v(investing) });
  rows.push({ kind: "spacer" });

  // FINANCING
  rows.push({ kind: "section", label: "FINANSIERINGSVERKSAMHETEN" });
  rows.push({ kind: "account", code: "23xx", label: "Förändring långfristiga skulder", values: v(finLoans) });
  rows.push({ kind: "account", code: "20xx", label: "Nyemission / utdelning",          values: v(finEquity) });
  const financing = financingDerived;
  rows.push({ kind: "subtotal", label: "Kassaflöde från finansieringsverksamhet", values: v(financing) });
  rows.push({ kind: "spacer" });

  // Total — guaranteed to equal cashDelta after the reconcile plug.
  const net = operating + investing + financing;
  rows.push({ kind: "total", label: "PERIODENS KASSAFLÖDE", values: v(net) });
  rows.push({ kind: "account", code: "1910", label: "Likvida medel vid periodens början", values: [openingCash, openingCash, openingCash, NaN, NaN, NaN] });
  rows.push({ kind: "account", code: "1910", label: "Likvida medel vid periodens slut",   values: [closingCash, closingCash, closingCash, NaN, NaN, NaN] });

  // Hard assertion: header / total MUST satisfy IB + flow = UB.
  const identityDiff = (openingCash + net) - closingCash;
  const warnings = needsReconcile
    ? [{
        severity: "warning" as const,
        message:
          `Avstämningsjustering ${Math.round(reconcileDiff).toLocaleString("sv-SE")} kr tillagd: ` +
          `indirekt härledning (${Math.round(netDerived).toLocaleString("sv-SE")} kr) avvek från ` +
          `faktisk kassarörelse (${Math.round(cashDelta).toLocaleString("sv-SE")} kr). ` +
          `Granska 16–29 och 20xx för dubbelräknade poster.`,
      }]
    : [];
  if (Math.abs(identityDiff) > 1) {
    warnings.push({
      severity: "warning" as const,
      message:
        `KRITISKT: IB + periodens kassaflöde ≠ UB (differens ${Math.round(identityDiff).toLocaleString("sv-SE")} kr). ` +
        `Kontakta support.`,
    });
    // eslint-disable-next-line no-console
    console.error("[Kassaflöde] Identity broken", {
      openingCash, closingCash, net, identityDiff,
      operating, investing, financing,
      derived: { operatingDerived, investingDerived, financingDerived, netDerived, reconcileDiff },
    });
  }

  const doc: StatementDocument = {
    header: {
      company: companyName,
      title: "Kassaflödesanalys (indirekt metod)",
      period: fmtPeriod(fromDate, toDate),
      generated: new Date(),
    },
    columns: [
      { key: "code",   label: "Konto",      align: "left",  format: "text",   width: 8 },
      { key: "label",  label: "Benämning",  align: "left",  format: "text",   width: 42 },
      { key: "period", label: "Perioden",   align: "right", format: "number", width: 14 },
      { key: "prior",  label: "Föregående", align: "right", format: "number", width: 14 },
      { key: "ytd",    label: "YTD",        align: "right", format: "number", width: 14 },
      { key: "budget", label: "—",          align: "right", format: "number", width: 12 },
      { key: "varKr",  label: "Avvik. kr",  align: "right", format: "number", width: 10 },
      { key: "varPct", label: "%",          align: "right", format: "percent", width: 8 },
    ],
    rows,
    warnings,
    footer: { confidentiality: "Konfidentiellt · Endast för internt bruk" },
  };

  // ── Per-row drilldown ───────────────────────────────────────────────
  // Classify each period line into its cashflow category by account range
  // and surface the underlying journal entries in the drilldown drawer.
  const drilldown = {} as Record<CashflowCategory, CashflowDrillRow[]>;
  const categoriesByKey = {} as Record<CashflowCategory, typeof CATEGORIES_BY_KEY[CashflowCategory]>;
  for (const k of Object.keys(CATEGORIES_BY_KEY) as CashflowCategory[]) {
    drilldown[k] = [];
    categoriesByKey[k] = CATEGORIES_BY_KEY[k];
  }
  const classifyAccount = (n: number): CashflowCategory | null => {
    if (n >= 1500 && n <= 1599) return "customer_in";
    if (n >= 1400 && n <= 1499) return "other_op_out"; // inventory rolls into WC-other
    if (n >= 2400 && n <= 2499) return "supplier_out";
    if (n >= 2700 && n <= 2799) return "other_op_out";
    if (n >= 2510 && n <= 2519) return "tax_out";
    if (n >= 1100 && n <= 1299) return "asset_invest";
    if (n >= 1300 && n <= 1399) return "fin_invest";
    if (n >= 2300 && n <= 2399) return "loans";
    if (n >= 2000 && n <= 2099) return "equity";
    if ((n >= 1600 && n <= 1899) || (n >= 2500 && n <= 2999)) return "other_op_out";
    return null;
  };
  for (const l of periodLines) {
    const n = parseInt(l.account_number, 10);
    if (!Number.isFinite(n)) continue;
    const cat = classifyAccount(n);
    if (!cat) continue;
    // Cash effect on this category from this posting: -(D - C).
    const cashEffect = -(l.debit - l.credit);
    if (Math.abs(cashEffect) < 0.005) continue;
    drilldown[cat].push({
      entryId: l.entry_id,
      entryDate: l.entry_date,
      description: l.description,
      cashDelta: cashEffect,
      counterAccount: l.account_number,
      counterAccountName: l.account_name,
    });
  }

  // Prior-period total cashflow (best-effort: use net income only if balances unknown)
  const priorNr = await getNetResult(companyId, priorFrom, priorTo);
  const priorDepr = computeDepreciation(priorLines);
  const priorNet = priorNr.netResult + priorDepr;

  return {
    doc,
    drilldown,
    summary: {
      inflows: Math.max(0, operating) + Math.max(0, investing) + Math.max(0, financing),
      outflows: Math.min(0, operating) + Math.min(0, investing) + Math.min(0, financing),
      net,
      openingCash,
      closingCash,
      priorNet,
    },
    categoriesByKey,
  };
}
