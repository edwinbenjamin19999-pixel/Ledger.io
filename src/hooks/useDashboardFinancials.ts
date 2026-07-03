/**
 * useDashboardFinancials — SINGLE source of truth for the dashboard's
 * four KPI cards (Resultat, Omsättning, Bruttomarginal, Likviditet) AND
 * the lower KPI strip in DashboardCockpit.
 *
 * Backed by the Postgres function `public.dashboard_financials`, which
 * computes all four figures from posted/approved journal lines for one
 * company and period. One round-trip, one calculation, no client-side math.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DashboardFinancials {
  omsattning: number;
  ksv: number;
  ovriga: number;
  resultat: number;
  /** percent (0–100) or null when omsättning is 0 → show "Ej tillämpbar" */
  bruttomarginal: number | null;
  likvida: number;
}

const fmt = (d: Date) => d.toISOString().slice(0, 10);

export interface FinancialsRange {
  from: Date;
  to: Date;
  label: string;
}

export type DashboardPeriod =
  | "month" | "this-month" | "last-month"
  | "q1" | "q2" | "q3" | "q4" | "this-quarter"
  | "year" | "this-year"
  | "custom";

export function resolveFinancialsRange(
  period: DashboardPeriod,
  custom?: { start: Date; end: Date },
): FinancialsRange {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const capToday = (endDate: Date) => (endDate.getTime() > now.getTime() ? now : endDate);
  const mr = (yr: number, mo: number) => ({
    start: new Date(yr, mo, 1),
    end: capToday(new Date(yr, mo + 1, 0, 23, 59, 59)),
  });
  let start: Date, end: Date, label: string;
  switch (period) {
    case "month":
    case "this-month": ({ start, end } = mr(y, m)); label = "Denna månad"; break;
    case "last-month": ({ start, end } = mr(y, m - 1)); label = "Förra månaden"; break;
    case "q1": start = new Date(y,0,1); end = capToday(new Date(y,2,31,23,59,59)); label = "Q1"; break;
    case "q2": start = new Date(y,3,1); end = capToday(new Date(y,5,30,23,59,59)); label = "Q2"; break;
    case "q3": start = new Date(y,6,1); end = capToday(new Date(y,8,30,23,59,59)); label = "Q3"; break;
    case "q4": start = new Date(y,9,1); end = capToday(new Date(y,11,31,23,59,59)); label = "Q4"; break;
    case "this-quarter": {
      const qs = Math.floor(m / 3) * 3;
      start = new Date(y, qs, 1); end = capToday(new Date(y, qs + 3, 0, 23, 59, 59));
      label = "Detta kvartal"; break;
    }
    case "year":
    case "this-year": start = new Date(y,0,1); end = now; label = "Detta år"; break;
    case "custom":
      if (!custom) { start = new Date(y,0,1); end = now; }
      else { start = custom.start; end = custom.end; }
      label = "Anpassad period";
      break;
  }
  return { from: start, to: end, label };
}

export function useDashboardFinancials(
  companyId: string | null | undefined,
  period: DashboardPeriod = "this-year",
  custom?: { start: Date; end: Date },
) {
  const range = resolveFinancialsRange(period, custom);
  const q = useQuery<DashboardFinancials | null>({
    queryKey: ["dashboard_financials", companyId, period, fmt(range.from), fmt(range.to)],
    enabled: !!companyId,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    queryFn: async () => {
      if (!companyId) return null;
      const { data, error } = await supabase.rpc("dashboard_financials", {
        p_company_id: companyId,
        p_from: fmt(range.from),
        p_to: fmt(range.to),
      });
      if (error) {
        console.error("[useDashboardFinancials] RPC error", error);
        throw error;
      }
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return null;
      return {
        omsattning: Number(row.omsattning ?? 0),
        ksv: Number(row.ksv ?? 0),
        ovriga: Number(row.ovriga ?? 0),
        resultat: Number(row.resultat ?? 0),
        bruttomarginal: row.bruttomarginal == null ? null : Number(row.bruttomarginal),
        likvida: Number(row.likvida ?? 0),
      };
    },
  });
  return { data: q.data ?? null, range, loading: q.isLoading || q.isFetching, error: q.error, refetch: q.refetch };
}
