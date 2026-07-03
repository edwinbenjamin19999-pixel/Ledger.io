import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdvisorContext } from "@/hooks/useAdvisorContext";

export type ForecastView = "monthly" | "quarterly" | "ytd" | "rolling12";
export type ScenarioMode = "base" | "optimistic" | "pessimistic";

export interface MonthPoint {
  /** ISO YYYY-MM */
  period: string;
  label: string;
  budget: number;
  actual: number;
  forecast: number;
  variance: number;
  variancePct: number;
}

export interface ClientForecastRow {
  clientId: string;
  clientName: string;
  budgetTotal: number;
  actualTotal: number;
  forecastTotal: number;
  variance: number;
  variancePct: number;
  monthly: MonthPoint[];
  riskLevel: "high" | "medium" | "low";
}

export interface FirmForecastResult {
  clients: ClientForecastRow[];
  aggregated: MonthPoint[];
  totals: {
    budget: number;
    actual: number;
    forecast: number;
    variance: number;
    variancePct: number;
  };
}

const SCENARIO_MULT: Record<ScenarioMode, { revenue: number; cost: number }> = {
  base: { revenue: 1.0, cost: 1.0 },
  optimistic: { revenue: 1.08, cost: 0.96 },
  pessimistic: { revenue: 0.9, cost: 1.08 },
};

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "Maj", "Jun",
  "Jul", "Aug", "Sep", "Okt", "Nov", "Dec",
];

interface BudgetRow {
  account_id: string;
  year: number;
  month: number;
  amount: number;
}

/**
 * Build budget+actual+forecast series for every client in the firm.
 * - Budget from `budgets` table (company-scoped, year/month/amount).
 * - Actual from `journal_entry_lines` aggregated per month from approved entries.
 * - Forecast = trailing 3-month avg actual blended with remaining budget,
 *   then scaled by scenario multipliers (revenue accounts 3xxx, cost 4xxx-7xxx).
 */
export function useFirmBudgetForecast(opts: {
  scenario: ScenarioMode;
  year: number;
}) {
  const { firmId, clients } = useAdvisorContext();
  const clientIds = clients.map((c) => c.id);

  return useQuery({
    queryKey: ["firm-budget-forecast", firmId, opts.year, opts.scenario, clientIds.join(",")],
    enabled: !!firmId && clientIds.length > 0,
    queryFn: async (): Promise<FirmForecastResult> => {
      const mult = SCENARIO_MULT[opts.scenario];
      const today = new Date();
      const currentMonth =
        today.getFullYear() === opts.year ? today.getMonth() + 1 : 12;

      // Fetch budgets, journal lines, and chart of accounts in parallel
      const [budgetsRes, linesRes, coaRes] = await Promise.all([
        supabase
          .from("budgets")
          .select("company_id, account_id, year, month, amount")
          .in("company_id", clientIds)
          .eq("year", opts.year),
        supabase
          .from("journal_entry_lines")
          .select(
            "debit, credit, account_number, journal_entries!inner(company_id, entry_date, status)",
          )
          .in("journal_entries.company_id", clientIds as string[])
          .gte("journal_entries.entry_date", `${opts.year}-01-01`)
          .lte("journal_entries.entry_date", `${opts.year}-12-31`)
          .in("journal_entries.status", ["approved", "posted"]),
        supabase
          .from("chart_of_accounts")
          .select("id, account_number, company_id")
          .in("company_id", clientIds),
      ]);

      const accountMap = new Map<string, string>();
      ((coaRes.data ?? []) as Array<{ id: string; account_number: string }>).forEach((a) => {
        accountMap.set(a.id, a.account_number);
      });

      // Group budgets by client
      const budgetByClient = new Map<string, BudgetRow[]>();
      (budgetsRes.data ?? []).forEach((b: any) => {
        const arr = budgetByClient.get(b.company_id) ?? [];
        arr.push(b);
        budgetByClient.set(b.company_id, arr);
      });

      // Group actuals: clientId -> month(1-12) -> { revenue, cost }
      const actualByClient = new Map<string, Map<number, { rev: number; cost: number }>>();
      (linesRes.data ?? []).forEach((l: any) => {
        const je = l.journal_entries;
        if (!je) return;
        const m = new Date(je.entry_date).getMonth() + 1;
        const acc = String(l.account_number ?? "");
        const isRevenue = acc.startsWith("3");
        const isCost = /^[4-7]/.test(acc);
        if (!isRevenue && !isCost) return;
        const map = actualByClient.get(je.company_id) ?? new Map();
        const cur = map.get(m) ?? { rev: 0, cost: 0 };
        if (isRevenue) {
          cur.rev += Number(l.credit ?? 0) - Number(l.debit ?? 0);
        } else {
          cur.cost += Number(l.debit ?? 0) - Number(l.credit ?? 0);
        }
        map.set(m, cur);
        actualByClient.set(je.company_id, map);
      });

      // Build per-client series
      const clientRows: ClientForecastRow[] = clients.map((c) => {
        const budgets = budgetByClient.get(c.id) ?? [];
        const actuals = actualByClient.get(c.id) ?? new Map();

        // Budget per month split into rev/cost via account number lookup
        const budMonthly = new Map<number, { rev: number; cost: number }>();
        budgets.forEach((b) => {
          const acc = accountMap.get(b.account_id) ?? "";
          const isRevenue = acc.startsWith("3");
          const cur = budMonthly.get(b.month) ?? { rev: 0, cost: 0 };
          if (isRevenue) cur.rev += Number(b.amount);
          else cur.cost += Number(b.amount);
          budMonthly.set(b.month, cur);
        });

        // Trailing 3-month average actual net for forecast extrapolation
        const trailing: number[] = [];
        for (let m = Math.max(1, currentMonth - 3); m < currentMonth; m++) {
          const a = actuals.get(m) ?? { rev: 0, cost: 0 };
          trailing.push(a.rev - a.cost);
        }
        const trailingAvg =
          trailing.length > 0
            ? trailing.reduce((s, v) => s + v, 0) / trailing.length
            : 0;

        const monthly: MonthPoint[] = MONTH_LABELS.map((label, idx) => {
          const m = idx + 1;
          const bud = budMonthly.get(m) ?? { rev: 0, cost: 0 };
          const act = actuals.get(m) ?? { rev: 0, cost: 0 };
          const budgetNet = bud.rev - bud.cost;
          const actualNet = act.rev - act.cost;
          let forecastNet: number;
          if (m < currentMonth) {
            forecastNet = actualNet;
          } else if (m === currentMonth) {
            forecastNet = actualNet || budgetNet;
          } else {
            // future month: scenario-adjusted blend of budget and trailing trend
            const scenarioBudget =
              bud.rev * mult.revenue - bud.cost * mult.cost;
            forecastNet = 0.6 * scenarioBudget + 0.4 * trailingAvg;
          }
          const variance = actualNet - budgetNet;
          const variancePct = budgetNet !== 0 ? (variance / Math.abs(budgetNet)) * 100 : 0;
          return {
            period: `${opts.year}-${String(m).padStart(2, "0")}`,
            label,
            budget: budgetNet,
            actual: m <= currentMonth ? actualNet : 0,
            forecast: forecastNet,
            variance,
            variancePct,
          };
        });

        const budgetTotal = monthly.reduce((s, m) => s + m.budget, 0);
        const actualTotal = monthly.reduce((s, m) => s + m.actual, 0);
        const forecastTotal = monthly.reduce((s, m) => s + m.forecast, 0);
        const variance = forecastTotal - budgetTotal;
        const variancePct = budgetTotal !== 0 ? (variance / Math.abs(budgetTotal)) * 100 : 0;

        const riskLevel: ClientForecastRow["riskLevel"] =
          variancePct < -15 ? "high" : variancePct < -5 ? "medium" : "low";

        return {
          clientId: c.id,
          clientName: c.name,
          budgetTotal,
          actualTotal,
          forecastTotal,
          variance,
          variancePct,
          monthly,
          riskLevel,
        };
      });

      // Aggregated firm-level series
      const aggregated: MonthPoint[] = MONTH_LABELS.map((label, idx) => {
        const m = idx + 1;
        const period = `${opts.year}-${String(m).padStart(2, "0")}`;
        const budget = clientRows.reduce((s, c) => s + c.monthly[idx].budget, 0);
        const actual = clientRows.reduce((s, c) => s + c.monthly[idx].actual, 0);
        const forecast = clientRows.reduce((s, c) => s + c.monthly[idx].forecast, 0);
        const variance = actual - budget;
        const variancePct = budget !== 0 ? (variance / Math.abs(budget)) * 100 : 0;
        return { period, label, budget, actual, forecast, variance, variancePct };
      });

      const totals = {
        budget: aggregated.reduce((s, m) => s + m.budget, 0),
        actual: aggregated.reduce((s, m) => s + m.actual, 0),
        forecast: aggregated.reduce((s, m) => s + m.forecast, 0),
        variance: 0,
        variancePct: 0,
      };
      totals.variance = totals.forecast - totals.budget;
      totals.variancePct =
        totals.budget !== 0 ? (totals.variance / Math.abs(totals.budget)) * 100 : 0;

      return {
        clients: clientRows.sort((a, b) => a.variancePct - b.variancePct),
        aggregated,
        totals,
      };
    },
    staleTime: 60_000,
  });
}

/**
 * Re-shape a monthly series into the requested view.
 */
export function reshapeView(monthly: MonthPoint[], view: ForecastView): MonthPoint[] {
  if (view === "monthly") return monthly;

  if (view === "quarterly") {
    const q: MonthPoint[] = [];
    for (let i = 0; i < 4; i++) {
      const slice = monthly.slice(i * 3, i * 3 + 3);
      q.push(aggregateSlice(slice, `Q${i + 1}`));
    }
    return q;
  }

  if (view === "ytd") {
    const out: MonthPoint[] = [];
    let cumB = 0,
      cumA = 0,
      cumF = 0;
    monthly.forEach((m) => {
      cumB += m.budget;
      cumA += m.actual;
      cumF += m.forecast;
      const variance = cumA - cumB;
      const variancePct = cumB !== 0 ? (variance / Math.abs(cumB)) * 100 : 0;
      out.push({
        period: m.period,
        label: m.label,
        budget: cumB,
        actual: cumA,
        forecast: cumF,
        variance,
        variancePct,
      });
    });
    return out;
  }

  // rolling12: just current 12 months as-is for now
  return monthly;
}

function aggregateSlice(slice: MonthPoint[], label: string): MonthPoint {
  const budget = slice.reduce((s, m) => s + m.budget, 0);
  const actual = slice.reduce((s, m) => s + m.actual, 0);
  const forecast = slice.reduce((s, m) => s + m.forecast, 0);
  const variance = actual - budget;
  const variancePct = budget !== 0 ? (variance / Math.abs(budget)) * 100 : 0;
  return {
    period: slice[0]?.period ?? label,
    label,
    budget,
    actual,
    forecast,
    variance,
    variancePct,
  };
}
