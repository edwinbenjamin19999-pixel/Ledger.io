import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSystemContext } from "@/contexts/SystemContext";

export type SystemModule = "cfo" | "benchmark" | "budget" | "accounting" | "closing" | "group" | "vat" | "tax";

export interface SystemInsight {
  id: string;
  title: string;
  explanation?: string;
  action_type: string;
  status: string;
  confidence: number | null;
  financial_impact: number | null;
  scope: SystemModule[];
  source_module?: SystemModule;
  payload: Record<string, unknown>;
  created_at: string;
}

interface InsightFilter {
  module?: SystemModule;
  minConfidence?: number;
  status?: string | string[];
  limit?: number;
}

/**
 * Single source of truth for cross-module insights.
 * Reads from ai_economist_actions (which acts as the central insight + action store).
 * All modules subscribe here — no module generates its own insights.
 */
export function useSystemInsights(filter: InsightFilter = {}) {
  const { companyId } = useSystemContext();
  const [insights, setInsights] = useState<SystemInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  // Stable filter key
  const filterKey = useMemo(() => JSON.stringify(filter), [filter]);

  useEffect(() => {
    if (!companyId) { setInsights([]); setLoading(false); return; }
    let active = true;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const fetchInsights = async () => {
      let query = supabase
        .from("ai_economist_actions")
        .select("id, title, action_type, status, confidence, financial_impact, scope, payload, created_at")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(filter.limit ?? 50);

      if (filter.minConfidence != null) query = query.gte("confidence", filter.minConfidence);
      if (filter.status) {
        const arr = (Array.isArray(filter.status) ? filter.status : [filter.status]) as Array<"executed" | "failed" | "pending" | "reverted">;
        query = query.in("status", arr);
      }

      const { data, error } = await query;
      if (!active) return;
      if (error) { setLoading(false); return; }

      const mapped: SystemInsight[] = (data || []).map((r: any) => {
        const payload = (r.payload || {}) as Record<string, unknown>;
        return {
          id: r.id,
          title: r.title || "Insikt",
          explanation: typeof payload.explanation === "string" ? (payload.explanation as string) : undefined,
          action_type: r.action_type,
          status: r.status,
          confidence: r.confidence,
          financial_impact: r.financial_impact,
          scope: (r.scope || []) as SystemModule[],
          source_module: (payload.source_module as SystemModule | undefined),
          payload,
          created_at: r.created_at,
        };
      });

      const filtered = filter.module
        ? mapped.filter((i) => i.scope.length === 0 || i.scope.includes(filter.module!))
        : mapped;

      setInsights(filtered);
      setLoading(false);
    };

    fetchInsights();

    // Realtime with 2s debounce
    const channel = supabase
      .channel(`insight-bus-${companyId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ai_economist_actions", filter: `company_id=eq.${companyId}` }, () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => { setVersion((v) => v + 1); }, 2000);
      })
      .subscribe();

    return () => {
      active = false;
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [companyId, filterKey, version]);

  return { insights, loading, refresh: () => setVersion((v) => v + 1) };
}
