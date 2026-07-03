import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFirmClients } from "@/hooks/useFirmDashboard";
import { useFirmClientsOps, type FirmClientOps } from "@/hooks/useFirmClientsOps";
import { useAdvisorContext } from "@/hooks/useAdvisorContext";

export type ProfitabilityTier = "critical" | "warning" | "healthy" | "premium" | "unknown";

export interface ClientProfitability extends FirmClientOps {
  // Firm-side service delivery
  hoursLogged12m: number;
  hoursBillable12m: number;
  hoursUnbilled12m: number;
  serviceCost12m: number; // hours * internal cost rate
  // Computed
  marginPct: number | null;          // (revenue - clientCost - serviceCost) / revenue
  marginAbs: number | null;          // revenue - clientCost - serviceCost
  netProfitability: number | null;   // alias kept for clarity (firm view)
  tier: ProfitabilityTier;
  // AI suggestion
  suggestion: ProfitabilitySuggestion | null;
}

export interface ProfitabilitySuggestion {
  kind: "price_increase" | "automate" | "renegotiate" | "review_scope" | "celebrate";
  headline: string;
  detail: string;
  estimatedUplift: number | null; // SEK / year
}

const INTERNAL_HOURLY_COST = 750;  // SEK — rough delivery cost / consultant hour
const TARGET_MARGIN = 0.35;         // 35% target margin

function classify(margin: number | null): ProfitabilityTier {
  if (margin === null) return "unknown";
  if (margin < 0.1) return "critical";
  if (margin < 0.25) return "warning";
  if (margin < 0.45) return "healthy";
  return "premium";
}

function buildSuggestion(
  c: FirmClientOps,
  hoursLogged: number,
  hoursUnbilled: number,
  marginPct: number | null,
  marginAbs: number | null,
): ProfitabilitySuggestion | null {
  if (marginPct === null) return null;

  // Critical — losing money or barely breaking even
  if (marginPct < 0.1) {
    // High unbilled hours → first try billing them
    if (hoursUnbilled > 8) {
      const uplift = Math.round(hoursUnbilled * 1500);
      return {
        kind: "review_scope",
        headline: `${hoursUnbilled.toFixed(0)} ofakturerade timmar`,
        detail: `Fakturera redan utfört arbete innan prishöjning övervägs. Potentiell intäkt ~${uplift.toLocaleString("sv-SE")} kr.`,
        estimatedUplift: uplift,
      };
    }
    // Otherwise propose a price hike to reach target margin
    const revenue = c.revenue12m ?? 0;
    if (revenue > 0) {
      const targetRevenue = revenue / (1 - TARGET_MARGIN) * (1 - marginPct);
      const uplift = Math.max(0, Math.round(targetRevenue - revenue));
      return {
        kind: "price_increase",
        headline: "Höj månadspriset",
        detail: `Marginal ${(marginPct * 100).toFixed(0)}%. Höj med ~${Math.round(((uplift / revenue) || 0) * 100)}% för att nå ${(TARGET_MARGIN * 100).toFixed(0)}% marginal.`,
        estimatedUplift: uplift,
      };
    }
    return {
      kind: "renegotiate",
      headline: "Omförhandla mandat",
      detail: "Kostnaden överstiger intäkten — omförhandla pris eller scope omgående.",
      estimatedUplift: marginAbs !== null ? Math.abs(marginAbs) : null,
    };
  }

  // Warning — below target margin → automation play
  if (marginPct < 0.25) {
    if (hoursLogged > 30) {
      const automationSaving = Math.round(hoursLogged * 0.3 * INTERNAL_HOURLY_COST);
      return {
        kind: "automate",
        headline: "Automatisera repetitiva moment",
        detail: `${hoursLogged.toFixed(0)}h loggade. Aktivera AI-bokföring + bankmatchning för att frigöra ~30% tid (~${automationSaving.toLocaleString("sv-SE")} kr).`,
        estimatedUplift: automationSaving,
      };
    }
    return {
      kind: "price_increase",
      headline: "Mindre prisjustering",
      detail: `Marginal ${(marginPct * 100).toFixed(0)}%. En höjning på 10–15% återställer marginalen utan riskerad relation.`,
      estimatedUplift: c.revenue12m ? Math.round(c.revenue12m * 0.12) : null,
    };
  }

  // Healthy — small nudge
  if (marginPct < 0.45) return null;

  // Premium — celebrate
  return {
    kind: "celebrate",
    headline: "Premium-klient",
    detail: `Marginal ${(marginPct * 100).toFixed(0)}% — använd som referens för uppsäljning till liknande klienter.`,
    estimatedUplift: null,
  };
}

/**
 * Enriches firm-wide client ops with time-tracking spend and computes
 * a true firm-side margin (revenue – client COGS – service-delivery cost).
 */
export function useFirmProfitability() {
  const { firmId } = useAdvisorContext();
  const { data: baseClients = [] } = useFirmClients(firmId ?? "");
  const { data: ops = [], isLoading: opsLoading } = useFirmClientsOps(firmId ?? "", baseClients);

  const companyIds = ops.map((c) => c.id);

  return useQuery<ClientProfitability[]>({
    queryKey: ["firm-profitability", firmId, companyIds.sort().join(",")],
    enabled: !!firmId && ops.length > 0 && !opsLoading,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const since = new Date();
      since.setMonth(since.getMonth() - 12);
      const sinceIso = since.toISOString().slice(0, 10);

      // Pull all firm-side time entries for the portfolio in one shot
      const { data: timeRows } = await supabase
        .from("time_entries")
        .select("company_id, duration_minutes, hourly_rate, is_billable, is_billed, entry_date")
        .in("company_id", companyIds)
        .gte("entry_date", sinceIso);

      const hoursMap = new Map<
        string,
        { logged: number; billable: number; unbilled: number; serviceCost: number }
      >();

      (timeRows ?? []).forEach((t) => {
        const key = t.company_id;
        const hours = (t.duration_minutes ?? 0) / 60;
        const rec = hoursMap.get(key) ?? { logged: 0, billable: 0, unbilled: 0, serviceCost: 0 };
        rec.logged += hours;
        if (t.is_billable) rec.billable += hours;
        if (t.is_billable && !t.is_billed) rec.unbilled += hours;
        rec.serviceCost += hours * INTERNAL_HOURLY_COST;
        hoursMap.set(key, rec);
      });

      const enriched: ClientProfitability[] = ops.map((c) => {
        const h = hoursMap.get(c.id) ?? { logged: 0, billable: 0, unbilled: 0, serviceCost: 0 };
        const revenue = c.revenue12m;
        const clientCost = c.cost12m ?? 0;

        let marginPct: number | null = null;
        let marginAbs: number | null = null;
        if (revenue !== null && revenue > 0) {
          marginAbs = revenue - clientCost - h.serviceCost;
          marginPct = marginAbs / revenue;
        }

        const tier = classify(marginPct);
        const suggestion = buildSuggestion(c, h.logged, h.unbilled, marginPct, marginAbs);

        return {
          ...c,
          hoursLogged12m: h.logged,
          hoursBillable12m: h.billable,
          hoursUnbilled12m: h.unbilled,
          serviceCost12m: h.serviceCost,
          marginPct,
          marginAbs,
          netProfitability: marginAbs,
          tier,
          suggestion,
        };
      });

      // Sort: lowest margin first (most urgent on top)
      enriched.sort((a, b) => {
        const am = a.marginPct ?? 999;
        const bm = b.marginPct ?? 999;
        return am - bm;
      });

      return enriched;
    },
  });
}

export const PROFITABILITY_INTERNAL_RATE = INTERNAL_HOURLY_COST;
export const PROFITABILITY_TARGET_MARGIN = TARGET_MARGIN;
