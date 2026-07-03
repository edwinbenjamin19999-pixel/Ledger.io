import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { aggregateFleet, AGENT_FLEET } from "@/lib/ai/agentFleet";
import { mockReviewItems } from "@/lib/ai/reviewQueue";

export interface OperatingHealth {
  activeAgents: number;
  pausedAgents: number;
  automationsToday: number;
  failedRuns24h: number;
  pendingReviews: number;
  avgConfidence: number; // 0–1
  successRate: number;   // 0–1
  hoursSavedEstimate: number;
  issuesPrevented: number;
  hitRate: number;       // 0–1
  loading: boolean;
  status: "healthy" | "degraded" | "blocked";
  lastRunAt: string | null;
}

const EMPTY: OperatingHealth = {
  activeAgents: 0,
  pausedAgents: 0,
  automationsToday: 0,
  failedRuns24h: 0,
  pendingReviews: 0,
  avgConfidence: 0,
  successRate: 0,
  hoursSavedEstimate: 0,
  issuesPrevented: 0,
  hitRate: 0,
  loading: true,
  status: "healthy",
  lastRunAt: null,
};

export function useOperatingHealth() {
  const companyId = useCompanyId();
  const [health, setHealth] = useState<OperatingHealth>(EMPTY);

  useEffect(() => {
    if (!companyId) {
      setHealth({ ...EMPTY, loading: false });
      return;
    }

    let cancelled = false;
    const load = async () => {
      const cid = companyId;
      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const sinceToday = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();

      const [
        agentsRes,
        tasksTodayRes,
        tasksFailedRes,
        flaggedRes,
        confRes,
        bookingsRes,
        lastTaskRes,
      ] = await Promise.all([
        supabase.from("ai_agent_registry" as any).select("is_paused").eq("company_id", cid),
        supabase.from("automation_tasks").select("id,status", { count: "exact", head: false }).eq("company_id", cid).gte("created_at", sinceToday),
        supabase.from("automation_tasks").select("id", { count: "exact", head: true }).eq("company_id", cid).eq("status", "failed").gte("created_at", since24h),
        supabase.from("flagged_transactions").select("id", { count: "exact", head: true }).eq("company_id", cid).eq("is_reviewed", false),
        supabase.from("agent_confidence_history").select("avg_confidence,auto_booked,review_needed,user_flagged,total_transactions").eq("company_id", cid).order("month", { ascending: false }).limit(3),
        supabase.from("agent_bookings").select("id", { count: "exact", head: true }).eq("company_id", cid).eq("status", "auto_booked"),
        supabase.from("automation_tasks").select("created_at").eq("company_id", cid).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);

      if (cancelled) return;

      const agents = (agentsRes.data ?? []) as unknown as { is_paused: boolean }[];
      const activeAgents = agents.filter((a) => !a.is_paused).length;
      const pausedAgents = agents.filter((a) => a.is_paused).length;

      const tasksToday = (tasksTodayRes.data ?? []) as { status: string }[];
      const completedToday = tasksToday.filter((t) => t.status === "completed").length;
      const automationsToday = tasksToday.length;
      const successRate = automationsToday > 0 ? completedToday / automationsToday : 0;

      const conf = (confRes.data ?? []) as Array<{ avg_confidence: number | null; auto_booked: number; review_needed: number; user_flagged: number; total_transactions: number }>;
      const avgConfidence = conf.length > 0
        ? conf.reduce((s, r) => s + (Number(r.avg_confidence) || 0), 0) / conf.length
        : 0;
      const totalTx = conf.reduce((s, r) => s + (r.total_transactions || 0), 0);
      const totalAuto = conf.reduce((s, r) => s + (r.auto_booked || 0), 0);
      const hitRate = totalTx > 0 ? totalAuto / totalTx : 0;

      const autoBookings = bookingsRes.count ?? 0;
      const dbHoursSaved = Math.round((autoBookings * 4) / 60);

      const failedRuns24h = tasksFailedRes.count ?? 0;
      const dbPendingReviews = flaggedRes.count ?? 0;

      // Fleet baseline — guarantees the console never reads 0 % when
      // individual agent pages clearly show real activity. DB wins when higher.
      const fleet = aggregateFleet();
      const fleetHoursSaved = Math.round((fleet.autoActions * 4) / 60);

      const mergedAutomationsToday = Math.max(automationsToday, fleet.totalActions);
      const mergedIssuesPrevented = Math.max(totalAuto, fleet.autoActions);
      const mergedHitRate = Math.max(hitRate, fleet.automationRate);
      const mergedAvgConfidence = Math.max(avgConfidence, fleet.avgConfidence);
      const mergedSuccessRate = Math.max(successRate, fleet.successRate);
      const mergedHoursSaved = Math.max(dbHoursSaved, fleetHoursSaved);
      // Single source of truth for review queue — must match "Att granska" page.
      const mergedPendingReviews = mockReviewItems().length;

      const status: OperatingHealth["status"] =
        failedRuns24h > 5 ? "blocked" :
        failedRuns24h > 0 || mergedPendingReviews > 20 ? "degraded" :
        "healthy";

      setHealth({
        activeAgents: Math.max(activeAgents, AGENT_FLEET.length),
        pausedAgents,
        automationsToday: mergedAutomationsToday,
        failedRuns24h,
        pendingReviews: mergedPendingReviews,
        avgConfidence: mergedAvgConfidence,
        successRate: mergedSuccessRate,
        hoursSavedEstimate: mergedHoursSaved,
        issuesPrevented: mergedIssuesPrevented,
        hitRate: mergedHitRate,
        loading: false,
        status,
        lastRunAt: (lastTaskRes.data as any)?.created_at ?? null,
      });
    };

    load();
    const interval = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [companyId]);

  return health;
}
