/**
 * Canonical "Årets resultat" selector.
 *
 * Single source of truth used by Resultat & balans, Kassaflödesanalys, AI CFO
 * and dashboard KPIs. All modules MUST derive the period's net result from
 * this helper so sign and amount match across the platform.
 *
 * Rules (BAS 2024, K2/K3-compatible, matches reportBuilder + statementDocument):
 *   • Status filter:  posted | approved  (no drafts or pending approvals)
 *   • Account ranges (from journal_entry_lines):
 *       3xxx                       revenue        (credit - debit)
 *       4xxx-7xxx, 78-79           operating cost (debit - credit)
 *       80-84                      finansiella poster
 *       88                          bokslutsdispositioner
 *       89 (excl 8999)             skatt
 *   • Account 8999 ("Årets resultat") is EXCLUDED from the sum — it is the
 *     bookkeeping appropriation that posts the result onto equity and would
 *     double-count if included.
 *   • Net result = revenue – (opCosts + finItems + approp + tax)
 *
 * The returned amount carries its natural sign (positive = profit).
 */
import { supabase } from "@/integrations/supabase/client";
import { format as formatDate } from "date-fns";

export interface NetResultBreakdown {
  netResult: number;
  revenue: number;
  costs: number;        // all expense classes summed (debit-positive)
  depreciation: number; // subset of costs (77-79xx) for cashflow add-back
  status: "ok" | "no_data";
}

interface AccRow { id: string; account_number: string }
interface EntryRow { id: string; entry_date: string }
interface LineRow {
  account_id: string;
  debit: number | null;
  credit: number | null;
  journal_entry_id: string;
}

/** Classify a BAS account number into our P&L bucket. */
function classify(num: number): "revenue" | "cost" | "depreciation" | "ignore" {
  if (!Number.isFinite(num)) return "ignore";
  if (num === 8999) return "ignore"; // year-end appropriation — never include
  if (num >= 3000 && num <= 3999) return "revenue";
  if (num >= 4000 && num <= 7699) return "cost";
  if (num >= 7700 && num <= 7999) return "depreciation"; // still a cost, tagged for cashflow add-back
  if (num >= 8000 && num <= 8499) return "cost"; // finansiella poster
  if (num >= 8800 && num <= 8899) return "cost"; // bokslutsdispositioner
  if (num >= 8900 && num <= 8998) return "cost"; // skatt (exkl 8999)
  return "ignore";
}

export async function getNetResult(
  companyId: string,
  fromDate?: Date,
  toDate?: Date,
): Promise<NetResultBreakdown> {
  if (!companyId) return { netResult: 0, revenue: 0, costs: 0, depreciation: 0, status: "no_data" };

  // 1. Accounts for this company
  const { data: accountsRaw } = await supabase
    .from("chart_of_accounts")
    .select("id, account_number")
    .eq("company_id", companyId);
  const accounts = (accountsRaw || []) as AccRow[];
  if (accounts.length === 0) {
    return { netResult: 0, revenue: 0, costs: 0, depreciation: 0, status: "no_data" };
  }
  const accMap = new Map<string, number>();
  for (const a of accounts) {
    const n = parseInt(a.account_number, 10);
    if (Number.isFinite(n)) accMap.set(a.id, n);
  }

  // 2. Posted/approved entries (optionally in period). Pending approvals are
  // deliberately excluded so reports match finalized ledger figures.
  let entriesQ = supabase
    .from("journal_entries")
    .select("id, entry_date")
    .eq("company_id", companyId)
    .in("status", ["approved", "posted"]);
  if (fromDate) entriesQ = entriesQ.gte("entry_date", formatDate(fromDate, "yyyy-MM-dd"));
  if (toDate)   entriesQ = entriesQ.lte("entry_date", formatDate(toDate,   "yyyy-MM-dd"));
  const { data: entriesRaw } = await entriesQ;
  const entries = (entriesRaw || []) as EntryRow[];
  if (entries.length === 0) {
    return { netResult: 0, revenue: 0, costs: 0, depreciation: 0, status: "no_data" };
  }
  const entryIds = new Set(entries.map((e) => e.id));

  // 3. Lines for those accounts (filter by entry on client side)
  const accountIds = Array.from(accMap.keys());
  const { data: linesRaw } = await supabase
    .from("journal_entry_lines")
    .select("account_id, debit, credit, journal_entry_id")
    .in("account_id", accountIds);
  const lines = (linesRaw || []) as LineRow[];

  let revenue = 0, costs = 0, depreciation = 0;
  for (const l of lines) {
    if (!entryIds.has(l.journal_entry_id)) continue;
    const num = accMap.get(l.account_id);
    if (num === undefined) continue;
    const d = Number(l.debit || 0);
    const c = Number(l.credit || 0);
    const bucket = classify(num);
    if (bucket === "revenue") revenue += c - d;
    else if (bucket === "cost") costs += d - c;
    else if (bucket === "depreciation") { costs += d - c; depreciation += d - c; }
  }

  return {
    netResult: revenue - costs,
    revenue,
    costs,
    depreciation,
    status: "ok",
  };
}
