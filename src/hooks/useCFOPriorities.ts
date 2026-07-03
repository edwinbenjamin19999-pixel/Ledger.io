import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CFOTier = "critical" | "high" | "medium" | "low";
export type CFOActionType = "create_accrual" | "send_reminder" | "reclassify" | "apply_deferral" | "generate_report" | "none";

export interface CFOPriority {
  id: string;
  tier: CFOTier;
  title: string;
  explanation: string;
  impact_sek: number;
  confidence: number;
  action_type: CFOActionType;
  source: string;
  cta_label: string;
  priority_score: number;
}

export interface CFOPrioritiesResponse {
  top: CFOPriority[];
  more: CFOPriority[];
  counts: { critical: number; high: number; medium: number; low: number };
  computed_at: string;
}

export function useCFOPriorities(companyId?: string | null, personaMode: "business_owner" | "accountant" = "business_owner") {
  const [data, setData] = useState<CFOPrioritiesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!companyId) { setLoading(false); return; }
    try {
      const { data: result, error: err } = await supabase.functions.invoke("score-cfo-priorities", {
        body: { company_id: companyId, persona_mode: personaMode },
      });
      if (err) throw err;
      setData(result as CFOPrioritiesResponse);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [companyId, personaMode]);

  useEffect(() => { refresh(); }, [refresh]);

  // Realtime: any new action invalidates priorities
  useEffect(() => {
    if (!companyId) return;
    const ch = supabase
      .channel(`cfo-priorities-${companyId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ai_economist_actions", filter: `company_id=eq.${companyId}` }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "annual_report_ai_suggestions", filter: `company_id=eq.${companyId}` }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [companyId, refresh]);

  return { data, loading, error, refresh };
}
