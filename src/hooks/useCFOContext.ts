import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";

export type CFOContextType = "kpi" | "benchmark" | "scenario" | "action" | "general";

export interface CFOContextPayload {
  type: CFOContextType;
  kpi?: string;
  value?: number;
  percentile?: number;
  peer_median?: number;
  scenario_name?: string;
  insight_id?: string;
  source?: string;
  notes?: string;
  label?: string;
}

export function encodeCFOContext(payload: CFOContextPayload): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
}

export function decodeCFOContext(encoded: string): CFOContextPayload | null {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(encoded))));
  } catch {
    return null;
  }
}

export function useCFOContext(): { context: CFOContextPayload; conversationId: string | null } {
  const [params] = useSearchParams();
  return useMemo(() => {
    const ctxParam = params.get("context");
    const decoded = ctxParam ? decodeCFOContext(ctxParam) : null;
    return {
      context: decoded || { type: "general" },
      conversationId: params.get("conversation"),
    };
  }, [params]);
}
