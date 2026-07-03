import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ClosingTask {
  key: string;
  label: string;
  status: "complete" | "review" | "incomplete";
  progress: number;
  detail: string;
}

export interface ClosingBlocker {
  key: string;
  title: string;
  severity: "critical" | "warning" | "info";
  fix_cta: string;
}

export interface ClosingLivePreview {
  net_result: number;
  tax_estimate: number;
  cash: number;
  equity: number;
  revenue: number;
  assets: number;
  br_diff: number;
  adjustments_count: number;
}

export interface ClosingStatus {
  status: "analyzing" | "ready" | "blocked" | "completed";
  progress_pct: number;
  ai_confidence: number;
  critical_issues_count: number;
  warning_issues_count: number;
  eta_seconds: number;
  tasks: ClosingTask[];
  live_preview: ClosingLivePreview;
  blockers: ClosingBlocker[];
  period_pct: number;
  computed_at: string;
}

export function useClosingStatus(companyId: string | null, fiscalYear: number) {
  const qc = useQueryClient();

  const query = useQuery<ClosingStatus | null>({
    queryKey: ["closing-status", companyId, fiscalYear],
    enabled: !!companyId && !!fiscalYear,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("compute-closing-status", {
        body: { company_id: companyId, fiscal_year: fiscalYear },
      });
      if (error) throw error;
      return data as ClosingStatus;
    },
  });

  // Realtime invalidation
  useEffect(() => {
    if (!companyId) return;
    const invalidate = () =>
      qc.invalidateQueries({ queryKey: ["closing-status", companyId, fiscalYear] });

    const ch = supabase
      .channel(`closing-${companyId}-${fiscalYear}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "annual_report_ai_suggestions" }, invalidate)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "annual_report_adjustments" }, invalidate)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "closing_runs",
          filter: `company_id=eq.${companyId}` }, invalidate)
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [companyId, fiscalYear, qc]);

  return query;
}
