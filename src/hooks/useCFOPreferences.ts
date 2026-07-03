import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CFODimension = "growth_bias" | "cost_focus" | "risk_appetite" | "tone";

export interface CFOPreference {
  dimension: CFODimension;
  score: number;
  evidence_count: number;
  last_signal_at: string;
}

export function useCFOPreferences(companyId?: string | null, userId?: string | null) {
  const [prefs, setPrefs] = useState<Record<CFODimension, number>>({
    growth_bias: 0, cost_focus: 0, risk_appetite: 0, tone: 0,
  });

  const load = useCallback(async () => {
    if (!companyId || !userId) return;
    const { data } = await supabase
      .from("cfo_user_preferences")
      .select("dimension, score, evidence_count, last_signal_at")
      .eq("company_id", companyId)
      .eq("user_id", userId);
    const next = { growth_bias: 0, cost_focus: 0, risk_appetite: 0, tone: 0 } as Record<CFODimension, number>;
    (data || []).forEach((r: { dimension: CFODimension; score: number }) => { next[r.dimension] = Number(r.score) || 0; });
    setPrefs(next);
  }, [companyId, userId]);

  useEffect(() => { load(); }, [load]);

  const signal = useCallback(async (dimension: CFODimension, delta: number) => {
    if (!companyId || !userId) return;
    const current = prefs[dimension] || 0;
    // Sliding average bias: new score = current * 0.9 + delta
    const nextScore = Math.max(-1, Math.min(1, current * 0.9 + delta));
    const { data: existing } = await supabase
      .from("cfo_user_preferences")
      .select("id, evidence_count")
      .eq("company_id", companyId).eq("user_id", userId).eq("dimension", dimension)
      .maybeSingle();
    if (existing) {
      await supabase.from("cfo_user_preferences")
        .update({ score: nextScore, evidence_count: (existing.evidence_count || 0) + 1, last_signal_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await supabase.from("cfo_user_preferences").insert({
        company_id: companyId, user_id: userId, dimension, score: nextScore, evidence_count: 1,
      });
    }
    setPrefs((p) => ({ ...p, [dimension]: nextScore }));
  }, [companyId, userId, prefs]);

  return { prefs, signal, refresh: load };
}
