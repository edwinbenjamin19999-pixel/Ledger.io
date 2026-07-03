/**
 * useFollowUpData — single hook that loads the data the Follow-up command center needs:
 *   - per-account monthly actuals (revenue + cost)
 *   - per-account monthly budget (from `budget_rows`)
 *   - latestActualMonth (last month with any actuals)
 *   - prior-year per-account totals (for forecast seasonality fallback)
 *
 * All in one batch so the page renders instantly.
 */

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AccountSeries } from "@/lib/follow-up/varianceEngine";

const MONTH_KEYS = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"] as const;

export interface FollowUpData {
  loading: boolean;
  error: string | null;
  budgetId: string | null;
  fiscalYear: number;
  actuals: AccountSeries[];
  budget: AccountSeries[];
  /** Per-account 12-vector keyed by account_number, used by computeForecast. */
  actualsByAccount: Record<string, number[]>;
  priorYearByAccount: Record<string, number[]>;
  /** Index 0..11 of last month with any actuals; -1 if none. */
  latestActualMonth: number;
  cashBalance: number;
}

const EMPTY: FollowUpData = {
  loading: true,
  error: null,
  budgetId: null,
  fiscalYear: new Date().getFullYear(),
  actuals: [],
  budget: [],
  actualsByAccount: {},
  priorYearByAccount: {},
  latestActualMonth: -1,
  cashBalance: 0,
};

export function useFollowUpData(companyId: string | null, fiscalYear: number): FollowUpData {
  const [state, setState] = useState<FollowUpData>({ ...EMPTY, fiscalYear });

  useEffect(() => {
    if (!companyId) {
      setState({ ...EMPTY, fiscalYear, loading: false });
      return;
    }
    let cancelled = false;
    (async () => {
      setState((s) => ({ ...s, loading: true, error: null, fiscalYear }));
      try {
        // 1. Active budget for the year
        const { data: plans } = await supabase
          .from("budget_plans")
          .select("id, fiscal_year, status")
          .eq("company_id", companyId)
          .eq("fiscal_year", fiscalYear)
          .order("created_at", { ascending: false })
          .limit(1);
        const budgetId = plans?.[0]?.id ?? null;

        // 2. Budget rows
        let budgetSeries: AccountSeries[] = [];
        if (budgetId) {
          const { data: br } = await supabase
            .from("budget_rows")
            .select("account_number, account_name, jan, feb, mar, apr, maj, jun, jul, aug, sep, okt, nov, dec")
            .eq("budget_id", budgetId);
          budgetSeries = (br || []).map((r: any) => ({
            account_number: r.account_number,
            account_name: r.account_name,
            monthly: MONTH_KEYS.map((m) => Number(r[m]) || 0),
          }));
        }

        // 3. Chart of accounts (id → number/name)
        const { data: accounts } = await supabase
          .from("chart_of_accounts")
          .select("id, account_number, account_name")
          .eq("company_id", companyId);
        const acctIdToInfo = new Map<string, { num: string; name: string }>();
        (accounts || []).forEach((a: any) =>
          acctIdToInfo.set(a.id, { num: a.account_number, name: a.account_name }),
        );

        // 4. Journal entries for current + previous year
        const fetchYear = async (year: number) => {
          const { data } = await supabase
            .from("journal_entries")
            .select("id, entry_date, journal_entry_lines(debit, credit, account_id)")
            .eq("company_id", companyId)
            .eq("status", "approved")
            .gte("entry_date", `${year}-01-01`)
            .lte("entry_date", `${year}-12-31`);
          return data || [];
        };
        const [currentYearEntries, prevYearEntries] = await Promise.all([
          fetchYear(fiscalYear),
          fetchYear(fiscalYear - 1),
        ]);

        const reduceEntries = (entries: any[]) => {
          const byAcct: Record<string, { name: string; monthly: number[] }> = {};
          let cash = 0;
          let latest = -1;
          entries.forEach((entry: any) => {
            const dateStr = entry.entry_date as string;
            if (!dateStr) return;
            const monthIdx = Math.max(0, Math.min(11, new Date(dateStr).getMonth()));
            (entry.journal_entry_lines || []).forEach((line: any) => {
              const info = acctIdToInfo.get(line.account_id);
              if (!info) return;
              const num = info.num;
              const debit = Number(line.debit) || 0;
              const credit = Number(line.credit) || 0;
              const isRevenue = num >= "3000" && num <= "3999";
              const isCost = num >= "4000" && num <= "7999";
              const isCash = num >= "1910" && num <= "1949";
              if (!isRevenue && !isCost && !isCash) return;
              if (!byAcct[num]) byAcct[num] = { name: info.name, monthly: new Array(12).fill(0) };
              const signed = isRevenue ? credit - debit : isCost ? debit - credit : debit - credit;
              byAcct[num].monthly[monthIdx] += signed;
              if (isCash) cash += signed;
              if (isRevenue || isCost) latest = Math.max(latest, monthIdx);
            });
          });
          return { byAcct, cash, latest };
        };

        const cur = reduceEntries(currentYearEntries);
        const prev = reduceEntries(prevYearEntries);

        const actuals: AccountSeries[] = Object.entries(cur.byAcct).map(([num, v]) => ({
          account_number: num,
          account_name: v.name,
          monthly: v.monthly,
        }));

        const actualsByAccount: Record<string, number[]> = {};
        Object.entries(cur.byAcct).forEach(([num, v]) => (actualsByAccount[num] = v.monthly));
        const priorYearByAccount: Record<string, number[]> = {};
        Object.entries(prev.byAcct).forEach(([num, v]) => (priorYearByAccount[num] = v.monthly));

        if (cancelled) return;
        setState({
          loading: false,
          error: null,
          budgetId,
          fiscalYear,
          actuals,
          budget: budgetSeries,
          actualsByAccount,
          priorYearByAccount,
          latestActualMonth: cur.latest,
          cashBalance: cur.cash,
        });
      } catch (e: any) {
        if (cancelled) return;
        console.error("useFollowUpData failed:", e);
        setState({ ...EMPTY, fiscalYear, loading: false, error: e?.message ?? "Kunde inte hämta data" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId, fiscalYear]);

  return state;
}
