import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type InsightStatus = "loading" | "no-data" | "limited" | "ready";

export interface DashboardInsightData {
  status: InsightStatus;
  currentRevenue: number;
  currentExpense: number;
  currentResult: number;
  previousRevenue: number;
  previousExpense: number;
  previousResult: number;
  delta: number;
  deltaPct: number | null;
  txCount: number;          // last 30 days approved/posted
  autoCount: number;        // ai_confidence >= 0.95
  flaggedCount: number;     // unreviewed flagged
  vatPrepared: boolean;
  currentMonthLabel: string;
  previousMonthLabel: string;
}

const MONTH_NAMES = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

function monthRange(year: number, month: number): { start: string; end: string } {
  const start = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
  const end = new Date(Date.UTC(year, month + 1, 1)).toISOString().slice(0, 10);
  return { start, end };
}

async function sumPeriod(companyId: string, start: string, end: string) {
  // Fetch lines via journal_entries in date range with valid status, then aggregate by account class
  const { data, error } = await supabase
    .from("journal_entries")
    .select("id, status, entry_date, journal_entry_lines(debit, credit, account_id, chart_of_accounts(account_number))")
    .eq("company_id", companyId)
    .in("status", ["posted", "approved"])
    .gte("entry_date", start)
    .lt("entry_date", end);

  if (error) throw error;
  let revenue = 0;
  let expense = 0;
  let entryCount = 0;
  for (const entry of data ?? []) {
    entryCount++;
    const lines = (entry as any).journal_entry_lines ?? [];
    for (const line of lines) {
      const acc = line.chart_of_accounts?.account_number as string | undefined;
      if (!acc) continue;
      const first = acc[0];
      const debit = Number(line.debit ?? 0);
      const credit = Number(line.credit ?? 0);
      if (first === "3") {
        // Revenue: credit increases revenue
        revenue += credit - debit;
      } else if (first === "4" || first === "5" || first === "6" || first === "7") {
        // Expense: debit increases expense
        expense += debit - credit;
      }
    }
  }
  return { revenue, expense, entryCount };
}

export function useDashboardInsightData(companyId: string | null | undefined): DashboardInsightData {
  const [state, setState] = useState<DashboardInsightData>({
    status: "loading",
    currentRevenue: 0,
    currentExpense: 0,
    currentResult: 0,
    previousRevenue: 0,
    previousExpense: 0,
    previousResult: 0,
    delta: 0,
    deltaPct: null,
    txCount: 0,
    autoCount: 0,
    flaggedCount: 0,
    vatPrepared: false,
    currentMonthLabel: "",
    previousMonthLabel: "",
  });

  useEffect(() => {
    if (!companyId) {
      setState((s) => ({ ...s, status: "no-data" }));
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        const now = new Date();
        const y = now.getUTCFullYear();
        const m = now.getUTCMonth();
        const cur = monthRange(y, m);
        const prevDate = new Date(Date.UTC(y, m - 1, 1));
        const prev = monthRange(prevDate.getUTCFullYear(), prevDate.getUTCMonth());

        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

        const [curSum, prevSum, txAll, txAuto, flagged, vat] = await Promise.all([
          sumPeriod(companyId, cur.start, cur.end),
          sumPeriod(companyId, prev.start, prev.end),
          supabase
            .from("journal_entries")
            .select("id", { count: "exact", head: true })
            .eq("company_id", companyId)
            .in("status", ["posted", "approved"])
            .gte("entry_date", thirtyDaysAgo),
          supabase
            .from("journal_entries")
            .select("id", { count: "exact", head: true })
            .eq("company_id", companyId)
            .in("status", ["posted", "approved"])
            .gte("entry_date", thirtyDaysAgo)
            .gte("ai_confidence", 0.95),
          supabase
            .from("flagged_transactions")
            .select("id", { count: "exact", head: true })
            .eq("company_id", companyId)
            .eq("is_reviewed", false),
          supabase
            .from("vat_declarations")
            .select("id", { count: "exact", head: true })
            .eq("company_id", companyId)
            .gte("created_at", new Date(Date.UTC(y, m, 1)).toISOString()),
        ]);

        if (cancelled) return;

        const curResult = curSum.revenue - curSum.expense;
        const prevResult = prevSum.revenue - prevSum.expense;
        const delta = curResult - prevResult;
        const deltaPct = prevResult !== 0 ? (delta / Math.abs(prevResult)) * 100 : null;
        const txCount = txAll.count ?? 0;
        const autoCount = txAuto.count ?? 0;
        const flaggedCount = flagged.count ?? 0;
        const vatPrepared = (vat.count ?? 0) > 0;

        let status: InsightStatus = "no-data";
        if (txCount === 0 && curSum.entryCount === 0 && prevSum.entryCount === 0) {
          status = "no-data";
        } else if (curSum.entryCount < 5 || prevSum.entryCount === 0 || prevResult === 0) {
          status = "limited";
        } else {
          status = "ready";
        }

        setState({
          status,
          currentRevenue: curSum.revenue,
          currentExpense: curSum.expense,
          currentResult: curResult,
          previousRevenue: prevSum.revenue,
          previousExpense: prevSum.expense,
          previousResult: prevResult,
          delta,
          deltaPct,
          txCount,
          autoCount,
          flaggedCount,
          vatPrepared,
          currentMonthLabel: MONTH_NAMES[m],
          previousMonthLabel: MONTH_NAMES[(m + 11) % 12],
        });
      } catch (e) {
        if (!cancelled) {
          console.error("useDashboardInsightData error", e);
          setState((s) => ({ ...s, status: "no-data" }));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [companyId]);

  return state;
}

export function formatSEK(n: number): string {
  return new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(Math.round(n)) + " kr";
}
