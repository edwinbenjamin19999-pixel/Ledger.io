import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { BoardModeId } from "@/lib/board-mode/modeProfiles";

export type ComparisonPeriod = "month" | "year" | "custom" | "last_month" | "last_year" | "budget";

export interface BoardKPI {
  key: string;
  label: string;
  value: number | null;
  delta_pct: number | null;
  direction: "up" | "down" | "flat";
  explanation: string;
  format: "currency" | "percent" | "days";
  unavailable_reason?: string;
}

export interface BoardRisk {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  explanation: string;
  impact: number;
  action_label: string;
  action_type: string;
}

export interface BoardChange {
  label: string;
  delta_pct: number | null;
  direction: "up" | "down" | "flat";
  impact: number;
  explanation: string;
}

export interface BoardOpportunity {
  title: string;
  explanation: string;
  estimated_impact: number;
  action: string;
}

export interface BoardAction {
  id: string;
  title: string;
  impact: number;
  confidence: number;
  urgency: "critical" | "high" | "medium" | "low";
  action_type: string;
  cta_label: string;
}

export interface EntityBreakdown {
  company_id: string;
  company_name: string;
  revenue: number;
  ebit: number;
  cash: number | null;
  revenue_share_pct: number;
}

export interface BoardSummary {
  mode: BoardModeId;
  narrative_variant: BoardModeId;
  summary: string;
  kpis: BoardKPI[];
  changes: BoardChange[];
  risks: BoardRisk[];
  opportunities: BoardOpportunity[];
  actions: BoardAction[];
  per_entity_breakdown: EntityBreakdown[];
  entity_count: number;
  comparison_period: ComparisonPeriod;
  updated_at: string;
}

export function useBoardSummary(
  entityIds: string[],
  mode: BoardModeId,
  comparisonPeriod: ComparisonPeriod = "month"
) {
  const [data, setData] = useState<BoardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pulsing, setPulsing] = useState(false);
  const debounceRef = useRef<number | null>(null);

  const refresh = useCallback(async (narrativeVariant?: BoardModeId) => {
    if (entityIds.length === 0) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data: result, error: err } = await supabase.functions.invoke("generate-board-summary", {
        body: {
          entity_ids: entityIds,
          mode,
          comparison_period: comparisonPeriod,
          narrative_variant: narrativeVariant || mode,
        },
      });
      if (err) throw err;
      setData(result as BoardSummary);
      setError(null);
      setPulsing(true);
      window.setTimeout(() => setPulsing(false), 1500);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [entityIds.join(","), mode, comparisonPeriod]);

  useEffect(() => { refresh(); }, [refresh]);

  // Realtime invalidation, scoped to first entity (debounced)
  useEffect(() => {
    if (entityIds.length === 0) return;
    const primary = entityIds[0];
    const trigger = () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => refresh(), 2000);
    };
    const ch = supabase
      .channel(`board-summary-${primary}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ai_economist_actions", filter: `company_id=eq.${primary}` }, trigger)
      .subscribe();
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      supabase.removeChannel(ch);
    };
  }, [entityIds.join(","), refresh]);

  return { data, loading, error, refresh, pulsing };
}
