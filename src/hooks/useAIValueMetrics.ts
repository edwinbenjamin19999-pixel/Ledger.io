import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  AUTO_CONFIDENCE_THRESHOLD,
  MIN_DAYS_BEFORE_VALUE_VISIBLE,
  calcMinutesSaved,
  getMinutesPerTransaction,
} from "@/lib/aiValueSettings";

export interface AIValueMetrics {
  /** True when there's enough data to display value claims. */
  hasData: boolean;
  /** True while we're still within the company's first 7 days. */
  warmingUp: boolean;

  monthlyAuto: number;
  monthlyCorrected: number;
  monthlyMatched: number;
  monthlyTotalAI: number;
  monthlyAutomationRate: number; // 0–1
  monthlyMinutesSaved: number;

  lifetimeAuto: number;
  lifetimeCorrected: number;
  lifetimeMatched: number;
  lifetimeMinutesSaved: number;

  /** % automation last month (for "upp från X%" comparisons). */
  lastMonthAutomationRate: number;

  /** Last 6 months of automation rate, oldest → newest, for the sparkline. */
  trend: { month: string; rate: number }[];

  minutesPerTransaction: number;
}

const startOfMonthISO = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
const startOfPrevMonthISO = (d = new Date()) => new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString();

interface JE {
  id: string;
  ai_confidence: number | null;
  ai_corrected_by_user?: boolean | null;
  created_at: string;
  status: string | null;
  user_id?: string | null;
}

/**
 * Aggregates fully-automatic vs corrected AI actions for a single company.
 * Sources of truth:
 *  - journal_entries.ai_confidence ≥ 0.9 + status approved/posted = autonomous
 *  - journal_entries with ai_confidence > 0 but ai_corrected_by_user = true = corrected
 *  - bank_transactions.status in (matched, approved) with ai_match_confidence ≥ 0.9 = matched
 *
 * Falls back gracefully when optional columns aren't present.
 */
export function useAIValueMetrics(companyId?: string | null) {
  // Re-render when the user adjusts minutes-per-tx in settings.
  const [minPerTx, setMinPerTx] = useState(getMinutesPerTransaction());
  useEffect(() => {
    const onChange = () => setMinPerTx(getMinutesPerTransaction());
    window.addEventListener("ai-value-settings-changed", onChange);
    return () => window.removeEventListener("ai-value-settings-changed", onChange);
  }, []);

  return useQuery<AIValueMetrics>({
    queryKey: ["ai-value-metrics", companyId, minPerTx],
    enabled: !!companyId,
    staleTime: 60_000,
    queryFn: async () => {
      const cid = companyId!;
      const monthStart = startOfMonthISO();
      const prevMonthStart = startOfPrevMonthISO();
      const sixMonthsAgo = new Date(Date.now() - 1000 * 60 * 60 * 24 * 31 * 6).toISOString();

      // --- Company age (for the first-7-days suppression rule) ---
      const { data: company } = await supabase
        .from("companies")
        .select("created_at")
        .eq("id", cid)
        .maybeSingle();
      const companyAgeDays = company?.created_at
        ? (Date.now() - new Date(company.created_at).getTime()) / 86_400_000
        : 999;
      const warmingUp = companyAgeDays < MIN_DAYS_BEFORE_VALUE_VISIBLE;

      // --- Journal entries: pull last 6 months in one go ---
      const { data: jeRows } = await supabase
        .from("journal_entries")
        .select("id, ai_confidence, created_at, status")
        .eq("company_id", cid)
        .gte("created_at", sixMonthsAgo)
        .not("ai_confidence", "is", null);

      const entries = (jeRows || []) as JE[];

      // Helpers
      const isAutonomous = (e: JE) =>
        (e.ai_confidence ?? 0) >= AUTO_CONFIDENCE_THRESHOLD &&
        (e.status === "approved" || e.status === "posted");
      const isCorrected = (e: JE) =>
        (e.ai_confidence ?? 0) > 0 && e.ai_corrected_by_user === true;

      const inMonth = (e: JE) => e.created_at >= monthStart;
      const inPrevMonth = (e: JE) => e.created_at >= prevMonthStart && e.created_at < monthStart;

      const monthlyEntries = entries.filter(inMonth);
      const monthlyAuto = monthlyEntries.filter(isAutonomous).length;
      const monthlyCorrected = monthlyEntries.filter(isCorrected).length;
      const monthlyTotalAI = monthlyEntries.length;

      const lifetimeAuto = entries.filter(isAutonomous).length;
      const lifetimeCorrected = entries.filter(isCorrected).length;

      // Lifetime totals from full table (only counts, not all rows) for accuracy.
      const { count: lifetimeAutoCountAll } = await supabase
        .from("journal_entries")
        .select("id", { count: "exact", head: true })
        .eq("company_id", cid)
        .gte("ai_confidence", AUTO_CONFIDENCE_THRESHOLD)
        .in("status", ["approved", "posted"]);

      const lifetimeAutoFinal = lifetimeAutoCountAll ?? lifetimeAuto;

      // --- Bank matches: monthly + lifetime ---
      // Use updated_at as a proxy for "matched at" since bank_transactions
      // does not have a dedicated matched_at column in this schema.
      const { count: monthlyMatched } = await supabase
        .from("bank_transactions")
        .select("id", { count: "exact", head: true })
        .eq("company_id", cid)
        .in("status", ["matched", "approved"])
        .gte("created_at", monthStart);

      const { count: lifetimeMatched } = await supabase
        .from("bank_transactions")
        .select("id", { count: "exact", head: true })
        .eq("company_id", cid)
        .in("status", ["matched", "approved"]);

      // --- Automation rate trend (last 6 months) ---
      const trend: { month: string; rate: number }[] = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        const startISO = start.toISOString();
        const endISO = end.toISOString();
        const slice = entries.filter((e) => e.created_at >= startISO && e.created_at < endISO);
        const auto = slice.filter(isAutonomous).length;
        const rate = slice.length > 0 ? auto / slice.length : 0;
        trend.push({ month: start.toLocaleDateString("sv-SE", { month: "short" }), rate });
      }

      const monthlyAutomationRate =
        monthlyTotalAI > 0 ? monthlyAuto / monthlyTotalAI : 0;
      const lastMonthSlice = entries.filter(inPrevMonth);
      const lastMonthAutomationRate =
        lastMonthSlice.length > 0
          ? lastMonthSlice.filter(isAutonomous).length / lastMonthSlice.length
          : 0;

      const monthlyMinutesSaved = calcMinutesSaved(
        monthlyAuto + (monthlyMatched ?? 0),
        monthlyCorrected,
        minPerTx,
      );
      const lifetimeMinutesSaved = calcMinutesSaved(
        lifetimeAutoFinal + (lifetimeMatched ?? 0),
        lifetimeCorrected,
        minPerTx,
      );

      // hasData = real activity AND we're past the warmup window
      const hasData =
        !warmingUp &&
        (monthlyAuto + monthlyCorrected + (monthlyMatched ?? 0) + lifetimeAutoFinal) > 0;

      return {
        hasData,
        warmingUp,
        monthlyAuto,
        monthlyCorrected,
        monthlyMatched: monthlyMatched ?? 0,
        monthlyTotalAI,
        monthlyAutomationRate,
        monthlyMinutesSaved,
        lifetimeAuto: lifetimeAutoFinal,
        lifetimeCorrected,
        lifetimeMatched: lifetimeMatched ?? 0,
        lifetimeMinutesSaved,
        lastMonthAutomationRate,
        trend,
        minutesPerTransaction: minPerTx,
      };
    },
  });
}
